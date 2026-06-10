import { z } from 'zod';

export const createProfessionalSchema = z.object({
    dni: z.string().optional(),
    enrollment: z.string().min(1, 'errors.validation.requiredField'),
    lastName: z.string().min(1, 'errors.validation.requiredField'),
    firstName: z.string().min(1, 'errors.validation.requiredField'),
    sex: z.enum(['Femenino', 'Masculino', 'Otro']).optional(),
    image: z.string().optional(),
});

export const updateProfessionalSchema = z.object({
    dni: z.string().optional(),
    enrollment: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    firstName: z.string().min(1).optional(),
    sex: z.enum(['Femenino', 'Masculino', 'Otro']).optional(),
    image: z.string().optional(),
});

export type CreateProfessionalDTO = z.infer<typeof createProfessionalSchema>;
export type UpdateProfessionalDTO = z.infer<typeof updateProfessionalSchema>;
