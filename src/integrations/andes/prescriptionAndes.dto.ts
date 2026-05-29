import { z } from 'zod';

export const andesDispenseSchema = z.object({
    recetaId: z.string().min(1, 'errors.validation.requiredField'),
    descripcion: z.string().min(1, 'errors.validation.requiredField'),
    cantidad: z.number().min(1),
    organizacion: z.object({
        id: z.string().optional(),
        nombre: z.string().optional(),
    }).optional(),
});

export const andesCancelDispenseSchema = z.object({
    recetaId: z.string().min(1, 'errors.validation.requiredField'),
    idDispensaApp: z.string().min(1, 'errors.validation.requiredField'),
    motivo: z.string().optional(),
    organizacion: z.object({
        id: z.string().optional(),
        nombre: z.string().optional(),
    }).optional(),
});

export const andesSuspendSchema = z.object({
    recetaId: z.string().min(1, 'errors.validation.requiredField'),
    motivo: z.string().min(1, 'errors.validation.requiredField'),
    observacion: z.string().optional(),
});

export const verifyRecetaSchema = z.object({
    dni: z.string().min(1, 'errors.validation.requiredField'),
    conceptId: z.string().min(1, 'errors.validation.requiredField'),
    sexo: z.string().min(1, 'errors.validation.requiredField'),
});

export type AndesDispenseDTO = z.infer<typeof andesDispenseSchema>;
export type AndesCancelDispenseDTO = z.infer<typeof andesCancelDispenseSchema>;
export type AndesSuspendDTO = z.infer<typeof andesSuspendSchema>;
export type VerifyRecetaDTO = z.infer<typeof verifyRecetaSchema>;
