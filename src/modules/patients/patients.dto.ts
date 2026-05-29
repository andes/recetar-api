import { z } from 'zod';

export const createPatientSchema = z.object({
    dni: z.string().min(6).max(11, 'errors.validation.invalidDni'),
    firstName: z.string().min(1, 'errors.validation.requiredField'),
    lastName: z.string().min(1, 'errors.validation.requiredField'),
    sex: z.enum(['Femenino', 'Masculino', 'Otro'], { message: 'errors.validation.invalidSex' }),
    fechaNac: z.string().optional(),
    nombreAutopercibido: z.string().optional(),
    genero: z.string().optional(),
    cuil: z.string().optional(),
});

export const updatePatientSchema = z.object({
    dni: z.string().min(6).max(11, 'errors.validation.invalidDni').optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    sex: z.enum(['Femenino', 'Masculino', 'Otro'], { message: 'errors.validation.invalidSex' }).optional(),
    fechaNac: z.string().optional(),
    nombreAutopercibido: z.string().optional(),
    genero: z.string().optional(),
    cuil: z.string().optional(),
});

export const getByDniSchema = z.object({
    dni: z.string().min(1),
});

export const getCoverageSchema = z.object({
    dni: z.string().min(1),
    sexo: z.string().min(1),
});

export type CreatePatientDTO = z.infer<typeof createPatientSchema>;
export type UpdatePatientDTO = z.infer<typeof updatePatientSchema>;
export type GetByDniDTO = z.infer<typeof getByDniSchema>;
export type GetCoverageDTO = z.infer<typeof getCoverageSchema>;
