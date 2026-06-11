import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
    VerifiedRegistrationResponse,
    VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
    AuthenticationResponseJSON,
    RegistrationResponseJSON,
    AuthenticatorTransportFuture,
} from '@simplewebauthn/types';

export interface WebAuthnConfig {
    rpName: string;
    rpID: string;
    origin: string;
}

export class WebAuthnUtils {
    static async generateRegistrationOptions(
        config: WebAuthnConfig,
        userID: string,
        userName: string,
        userDisplayName: string,
        excludedCredentials: Array<{ id: string; transports?: string[] }> = []
    ) {
        const options = await generateRegistrationOptions({
            rpName: config.rpName,
            rpID: config.rpID,
            userID: new TextEncoder().encode(userID),
            userName,
            userDisplayName,
            attestationType: 'none',
            excludeCredentials: excludedCredentials.map(cred => ({
                id: cred.id,
                transports: (cred.transports || []) as AuthenticatorTransportFuture[],
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform',
            },
        });

        return options;
    }

    static async verifyRegistrationResponse(
        config: WebAuthnConfig,
        response: RegistrationResponseJSON,
        expectedChallenge: string
    ): Promise<VerifiedRegistrationResponse> {
        const verification = await verifyRegistrationResponse({
            response,
            expectedChallenge,
            expectedOrigin: config.origin,
            expectedRPID: config.rpID,
        });

        return verification;
    }

    static async generateAuthenticationOptions(
        config: WebAuthnConfig,
        allowedCredentials: Array<{ id: string; transports?: string[] }> = []
    ) {
        const options = await generateAuthenticationOptions({
            rpID: config.rpID,
            allowCredentials: allowedCredentials.map(cred => ({
                id: cred.id,
                transports: (cred.transports || []) as AuthenticatorTransportFuture[],
            })),
            userVerification: 'preferred',
        });

        return options;
    }

    static async verifyAuthenticationResponse(
        config: WebAuthnConfig,
        response: AuthenticationResponseJSON,
        expectedChallenge: string,
        credentialPublicKey: string,
        credentialCounter: number
    ): Promise<VerifiedAuthenticationResponse> {
        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: config.origin,
            expectedRPID: config.rpID,
            credential: {
                id: response.id,
                publicKey: Buffer.from(credentialPublicKey, 'base64'),
                counter: credentialCounter,
            },
        });

        return verification;
    }
}
