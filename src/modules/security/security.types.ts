export interface WebAuthnCredential {
    id: string;
    deviceType: string;
    backedUp: boolean;
    transport: string[];
    createdAt: string;
    lastUsedAt?: string;
}

export interface SecurityPinStatus {
    isActive: boolean;
}

export interface SecurityTokenResponse {
    securityToken: string;
}
