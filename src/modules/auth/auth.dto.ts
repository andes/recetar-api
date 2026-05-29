import { z } from 'zod';

export const loginSchema = z.object({
    identifier: z.string().min(1, 'errors.auth.incompleteBody'),
    password: z.string().min(1, 'errors.auth.incompleteBody'),
});
export type LoginDTO = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
    username: z.string().min(1),
    email: z.string().email().optional().or(z.literal('')),
    password: z.string().min(8, 'errors.validation.weakPassword'),
    businessName: z.string().optional(),
    enrollment: z.string().optional(),
    cuil: z.string().optional(),
    roleType: z.string().min(1),
    captcha: z.string().min(1, 'errors.auth.incompleteBody'),
    profesion: z.any().optional(),
    fechaEgreso: z.string().optional(),
    fechaMatVencimiento: z.string().optional(),
    disposicionHabilitacion: z.string().optional(),
    vencimientoHabilitacion: z.string().optional(),
});
export type RegisterDTO = z.infer<typeof registerSchema>;

export const refreshSchema = z.object({
    refreshToken: z.string().min(1),
});
export type RefreshDTO = z.infer<typeof refreshSchema>;

export const resetPasswordSchema = z.object({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(8, 'errors.validation.weakPassword'),
});
export type ResetPasswordDTO = z.infer<typeof resetPasswordSchema>;

export const recoverPasswordSchema = z.object({
    authenticationToken: z.string().min(1),
    newPassword: z.string().min(8, 'errors.validation.weakPassword'),
});
export type RecoverPasswordDTO = z.infer<typeof recoverPasswordSchema>;

export const setValidationTokenSchema = z.object({
    usuario: z.string().min(1),
});
export type SetValidationTokenDTO = z.infer<typeof setValidationTokenSchema>;

export const getTokenSchema = z.object({
    username: z.string().min(1),
});
export type GetTokenDTO = z.infer<typeof getTokenSchema>;

export const getProfessionalsAndesSchema = z.object({
    documento: z.string().min(1),
    matricula: z.string().optional(),
    cuil: z.string().optional(),
    fechaEgreso: z.string().optional(),
    fechaMatVencimiento: z.string().optional(),
    profesionCodigo: z.string().optional(),
});
export type GetProfessionalsAndesDTO = z.infer<typeof getProfessionalsAndesSchema>;
