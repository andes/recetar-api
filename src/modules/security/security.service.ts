import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { SecurityRepository } from './security.repository';
import { SecurityPinUtils } from './security-pin.utils';
import { WebAuthnUtils, WebAuthnConfig } from './webauthn.utils';
import { IUser } from '../../models/user.model';
import {
    InvalidPasswordError,
    InvalidPinError,
    PinAlreadyActiveError,
    PinNotActiveError,
    WebAuthnCredentialNotFoundError,
    InvalidWebAuthnResponseError,
    ChallengeExpiredError,
    SecurityTokenInvalidError,
    SecurityTokenExpiredError,
} from './security.errors';
import { WebAuthnCredential, SecurityTokenResponse } from './security.types';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/types';

export class SecurityService {
    private readonly webAuthnConfig: WebAuthnConfig;

    constructor(private readonly repository: SecurityRepository) {
        this.webAuthnConfig = {
            rpName: process.env.WEBAUTHN_RP_NAME || 'RecetAR',
            rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
            origin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:8080',
        };
    }

    async getPinStatus(userId: string): Promise<{ isActive: boolean }> {
        const user = await this.repository.findById(userId);
        if (!user) {
            return { isActive: false };
        }
        return { isActive: user.securityPin?.isActive || false };
    }

    async hasPinActive(userId: string): Promise<boolean> {
        const status = await this.getPinStatus(userId);
        return status.isActive;
    }

    async setupPin(userId: string, currentPassword: string, pin: string): Promise<void> {
        const user = await this.repository.findById(userId);
        if (!user) {
            throw new InvalidPasswordError();
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            throw new InvalidPasswordError();
        }

        if (user.securityPin?.isActive) {
            throw new PinAlreadyActiveError();
        }

        const hash = await SecurityPinUtils.hashPin(pin);
        await this.repository.updateSecurityPin(userId, hash, true);
    }

    async changePin(userId: string, currentPin: string, newPin: string): Promise<void> {
        const user = await this.repository.findById(userId);
        if (!user || !user.securityPin?.isActive) {
            throw new PinNotActiveError();
        }

        const isValid = await SecurityPinUtils.verifyPin(currentPin, user.securityPin.hash);
        if (!isValid) {
            throw new InvalidPinError();
        }

        const hash = await SecurityPinUtils.hashPin(newPin);
        await this.repository.updateSecurityPin(userId, hash, true);
    }

    async disablePin(userId: string, password: string): Promise<void> {
        const user = await this.repository.findById(userId);
        if (!user) {
            throw new InvalidPasswordError();
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            throw new InvalidPasswordError();
        }

        await this.repository.disableSecurityPin(userId);
    }

    async verifyPin(userId: string, pin: string): Promise<boolean> {
        const user = await this.repository.findById(userId);
        if (!user || !user.securityPin?.isActive) {
            return false;
        }

        return SecurityPinUtils.verifyPin(pin, user.securityPin.hash);
    }

    async hasWebAuthnCredentials(userId: string): Promise<boolean> {
        const user = await this.repository.findById(userId);
        return !!(user?.webauthnCredentials && user.webauthnCredentials.length > 0);
    }

    async getCredentials(userId: string): Promise<WebAuthnCredential[]> {
        const user = await this.repository.findById(userId);
        if (!user || !user.webauthnCredentials) {
            return [];
        }

        return user.webauthnCredentials.map(cred => ({
            id: cred.credentialId,
            deviceType: cred.deviceType,
            backedUp: cred.backedUp,
            transport: cred.transport,
            createdAt: cred.createdAt.toISOString(),
            lastUsedAt: cred.lastUsedAt?.toISOString(),
        }));
    }

    async getRegistrationOptions(userId: string, name?: string) {
        const user = await this.repository.findById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        const excludedCredentials = (user.webauthnCredentials || []).map(cred => ({
            id: cred.credentialId,
            transports: cred.transport,
        }));

        const options = await WebAuthnUtils.generateRegistrationOptions(
            this.webAuthnConfig,
            user._id.toString(),
            user.email,
            name || user.businessName,
            excludedCredentials
        );

        const expires = new Date(Date.now() + 60000);
        await this.repository.updateWebAuthnChallenge(userId, options.challenge, expires);

        return options;
    }

    async verifyRegistration(userId: string, response: RegistrationResponseJSON) {
        const user = await this.repository.findById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        const expectedChallenge = user.webauthnChallenge;
        const expires = user.webauthnChallengeExpires;

        if (!expectedChallenge || !expires || expires < new Date()) {
            throw new ChallengeExpiredError();
        }

        try {
            const verification = await WebAuthnUtils.verifyRegistrationResponse(
                this.webAuthnConfig,
                response,
                expectedChallenge
            );

            if (verification.verified && verification.registrationInfo) {
                const { credential } = verification.registrationInfo;

                await this.repository.addWebAuthnCredential(userId, {
                    credentialId: credential.id,
                    publicKey: Buffer.from(credential.publicKey).toString('base64'),
                    counter: credential.counter,
                    deviceType: 'singleDevice',
                    backedUp: false,
                    transport: response.response.transports || [],
                });

                await this.repository.clearWebAuthnChallenge(userId);

                return { message: 'Credencial registrada exitosamente' };
            } else {
                throw new InvalidWebAuthnResponseError();
            }
        } catch (error) {
            if (error instanceof InvalidWebAuthnResponseError) {
                throw error;
            }
            throw new InvalidWebAuthnResponseError();
        }
    }

    async getAuthenticationOptions(userId: string) {
        const user = await this.repository.findById(userId);
        if (!user || !user.webauthnCredentials || user.webauthnCredentials.length === 0) {
            throw new WebAuthnCredentialNotFoundError();
        }

        const allowedCredentials = user.webauthnCredentials.map(cred => ({
            id: cred.credentialId,
            transports: cred.transport,
        }));

        const options = await WebAuthnUtils.generateAuthenticationOptions(
            this.webAuthnConfig,
            allowedCredentials
        );

        const expires = new Date(Date.now() + 60000);
        await this.repository.updateWebAuthnChallenge(userId, options.challenge, expires);

        return options;
    }

    async verifyAuthentication(userId: string, response: AuthenticationResponseJSON): Promise<SecurityTokenResponse> {
        const user = await this.repository.findById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        const expectedChallenge = user.webauthnChallenge;
        const expires = user.webauthnChallengeExpires;

        if (!expectedChallenge || !expires || expires < new Date()) {
            throw new ChallengeExpiredError();
        }

        const credential = user.webauthnCredentials?.find(c => c.credentialId === response.id);
        if (!credential) {
            throw new WebAuthnCredentialNotFoundError();
        }

        try {
            const verification = await WebAuthnUtils.verifyAuthenticationResponse(
                this.webAuthnConfig,
                response,
                expectedChallenge,
                credential.publicKey,
                credential.counter
            );

            if (verification.verified) {
                await this.repository.updateWebAuthnCredentialCounter(
                    userId,
                    credential.credentialId,
                    verification.authenticationInfo.newCounter
                );

                const securityToken = crypto.randomBytes(32).toString('hex');
                const expiresAt = new Date(Date.now() + 600000);

                await this.repository.createSecurityToken(userId, securityToken, expiresAt);
                await this.repository.clearWebAuthnChallenge(userId);

                return { securityToken };
            } else {
                throw new InvalidWebAuthnResponseError();
            }
        } catch (error) {
            if (error instanceof InvalidWebAuthnResponseError || error instanceof WebAuthnCredentialNotFoundError) {
                throw error;
            }
            throw new InvalidWebAuthnResponseError();
        }
    }

    async deleteCredential(userId: string, credentialId: string): Promise<void> {
        const user = await this.repository.findById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        const credentialExists = user.webauthnCredentials?.some(c => c.credentialId === credentialId);
        if (!credentialExists) {
            throw new WebAuthnCredentialNotFoundError();
        }

        await this.repository.removeWebAuthnCredential(userId, credentialId);
    }

    async verifySecurityToken(userId: string, token: string): Promise<boolean> {
        const securityToken = await this.repository.findSecurityToken(token, userId);
        if (!securityToken) {
            return false;
        }

        if (securityToken.expiresAt < new Date()) {
            return false;
        }

        await this.repository.markSecurityTokenAsUsed(token);
        return true;
    }
}
