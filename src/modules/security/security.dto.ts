import { z } from 'zod';

export const setupSecurityPinSchema = z.object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    pin: z.string().regex(/^\d{4}$/, 'El PIN debe tener exactamente 4 dígitos')
});
export type SetupSecurityPinDTO = z.infer<typeof setupSecurityPinSchema>;

export const changeSecurityPinSchema = z.object({
    currentPin: z.string().regex(/^\d{4}$/, 'El PIN actual debe tener 4 dígitos'),
    newPin: z.string().regex(/^\d{4}$/, 'El nuevo PIN debe tener 4 dígitos')
});
export type ChangeSecurityPinDTO = z.infer<typeof changeSecurityPinSchema>;

export const disableSecurityPinSchema = z.object({
    password: z.string().min(1, 'La contraseña es requerida')
});
export type DisableSecurityPinDTO = z.infer<typeof disableSecurityPinSchema>;

export const registerWebAuthnSchema = z.object({
    name: z.string().optional()
});
export type RegisterWebAuthnDTO = z.infer<typeof registerWebAuthnSchema>;

export const verifyWebAuthnRegistrationSchema = z.object({
    id: z.string(),
    rawId: z.string(),
    type: z.string(),
    response: z.object({
        clientDataJSON: z.string(),
        attestationObject: z.string(),
        transports: z.array(z.string()).optional()
    }),
    authenticatorAttachment: z.string().optional()
});
export type VerifyWebAuthnRegistrationDTO = z.infer<typeof verifyWebAuthnRegistrationSchema>;

export const verifyWebAuthnAssertionSchema = z.object({
    id: z.string(),
    rawId: z.string(),
    type: z.string(),
    response: z.object({
        clientDataJSON: z.string(),
        authenticatorData: z.string(),
        signature: z.string(),
        userHandle: z.string().optional()
    }),
    authenticatorAttachment: z.string().optional()
});
export type VerifyWebAuthnAssertionDTO = z.infer<typeof verifyWebAuthnAssertionSchema>;
