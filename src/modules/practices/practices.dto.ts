import { z } from 'zod';

export const createPracticeSchema = z.object({
    date: z.string().min(1, 'errors.validation.requiredField'),
    patient: z.object({
        firstName: z.string().min(1, 'errors.validation.requiredField'),
        lastName: z.string().min(1, 'errors.validation.requiredField'),
        dni: z.string().min(1, 'errors.validation.requiredField'),
        sex: z.string().min(1, 'errors.validation.requiredField'),
        obraSocial: z.object({
            nombre: z.string().optional(),
            codigoPuco: z.string().optional(),
            numeroAfiliado: z.string().optional(),
        }).optional(),
    }),
    professional: z.object({
        userId: z.string().min(1, 'errors.validation.requiredField'),
        enrollment: z.string().optional(),
        cuil: z.string().optional(),
        businessName: z.string().optional(),
        profesionGrado: z.array(z.object({
            profesion: z.string(),
            codigoProfesion: z.string(),
            numeroMatricula: z.string(),
        })).optional(),
    }),
    practice: z.string().optional(),
    diagnostic: z.string().optional(),
    indications: z.string().optional(),
    status: z.enum(['active', 'completed', 'cancelled']).optional(),
});

export const updatePracticeSchema = z.object({
    date: z.string().optional(),
    patient: z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        dni: z.string().optional(),
        sex: z.string().optional(),
        obraSocial: z.object({
            nombre: z.string().optional(),
            codigoPuco: z.string().optional(),
            numeroAfiliado: z.string().optional(),
        }).optional(),
    }).optional(),
    professional: z.object({
        userId: z.string().optional(),
        enrollment: z.string().optional(),
        cuil: z.string().optional(),
        businessName: z.string().optional(),
        profesionGrado: z.array(z.object({
            profesion: z.string(),
            codigoProfesion: z.string(),
            numeroMatricula: z.string(),
        })).optional(),
    }).optional(),
    practice: z.string().optional(),
    diagnostic: z.string().optional(),
    indications: z.string().optional(),
    status: z.enum(['active', 'completed', 'cancelled']).optional(),
});

export const searchPracticeSchema = z.object({
    searchTerm: z.string().min(1, 'errors.validation.requiredField'),
    skip: z.coerce.number().int().nonnegative().optional(),
    limit: z.coerce.number().int().positive().optional(),
});

export type CreatePracticeDTO = z.infer<typeof createPracticeSchema>;
export type UpdatePracticeDTO = z.infer<typeof updatePracticeSchema>;
export type SearchPracticeDTO = z.infer<typeof searchPracticeSchema>;
