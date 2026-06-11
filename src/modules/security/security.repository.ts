import User, { IUser } from '../../models/user.model';
import SecurityToken, { ISecurityToken } from '../../models/security-token.model';
import { Types } from 'mongoose';

export class SecurityRepository {
    async findById(userId: string): Promise<IUser | null> {
        return User.findById(userId)
            .select('+password')
            .exec();
    }

    async saveUser(user: IUser): Promise<IUser> {
        return user.save();
    }

    async updateSecurityPin(
        userId: string,
        hash: string,
        isActive: boolean
    ): Promise<IUser | null> {
        return User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    'securityPin.hash': hash,
                    'securityPin.isActive': isActive,
                    updatedAt: new Date()
                }
            },
            { new: true }
        ).exec();
    }

    async disableSecurityPin(userId: string): Promise<IUser | null> {
        return User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    'securityPin.isActive': false,
                    updatedAt: new Date()
                },
                $unset: {
                    'securityPin.hash': ''
                }
            },
            { new: true }
        ).exec();
    }

    async addWebAuthnCredential(
        userId: string,
        credential: {
            credentialId: string;
            publicKey: string;
            counter: number;
            deviceType: string;
            backedUp: boolean;
            transport: string[];
        }
    ): Promise<IUser | null> {
        return User.findByIdAndUpdate(
            userId,
            {
                $push: { webauthnCredentials: { ...credential, createdAt: new Date() } },
                $set: { updatedAt: new Date() }
            },
            { new: true }
        ).exec();
    }

    async updateWebAuthnCredentialCounter(
        userId: string,
        credentialId: string,
        counter: number
    ): Promise<IUser | null> {
        return User.findOneAndUpdate(
            {
                _id: userId,
                'webauthnCredentials.credentialId': credentialId
            },
            {
                $set: {
                    'webauthnCredentials.$.counter': counter,
                    'webauthnCredentials.$.lastUsedAt': new Date(),
                    updatedAt: new Date()
                }
            },
            { new: true }
        ).exec();
    }

    async removeWebAuthnCredential(
        userId: string,
        credentialId: string
    ): Promise<IUser | null> {
        return User.findByIdAndUpdate(
            userId,
            {
                $pull: { webauthnCredentials: { credentialId } },
                $set: { updatedAt: new Date() }
            },
            { new: true }
        ).exec();
    }

    async updateWebAuthnChallenge(
        userId: string,
        challenge: string,
        expires: Date
    ): Promise<IUser | null> {
        return User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    webauthnChallenge: challenge,
                    webauthnChallengeExpires: expires,
                    updatedAt: new Date()
                }
            },
            { new: true }
        ).exec();
    }

    async clearWebAuthnChallenge(userId: string): Promise<IUser | null> {
        return User.findByIdAndUpdate(
            userId,
            {
                $unset: {
                    webauthnChallenge: '',
                    webauthnChallengeExpires: ''
                },
                $set: { updatedAt: new Date() }
            },
            { new: true }
        ).exec();
    }

    async createSecurityToken(
        userId: string,
        token: string,
        expiresAt: Date
    ): Promise<ISecurityToken> {
        const securityToken = new SecurityToken({
            token,
            userId: new Types.ObjectId(userId),
            createdAt: new Date(),
            expiresAt,
            used: false
        });
        return securityToken.save();
    }

    async findSecurityToken(token: string, userId: string): Promise<ISecurityToken | null> {
        return SecurityToken.findOne({
            token,
            userId: new Types.ObjectId(userId) as any,
            used: false,
            expiresAt: { $gt: new Date() }
        }).exec();
    }

    async markSecurityTokenAsUsed(token: string): Promise<ISecurityToken | null> {
        return SecurityToken.findOneAndUpdate(
            { token, used: false },
            { $set: { used: true } },
            { new: true }
        ).exec();
    }
}
