import { z } from 'zod';

const profesionGradoSchema = z.object({
    profesion: z.string().min(1, 'errors.validation.requiredField'),
    codigoProfesion: z.string().min(1, 'errors.validation.requiredField'),
    numeroMatricula: z.string().min(1, 'errors.validation.requiredField'),
});

const professionalSchema = z.object({
    userId: z.string().min(1, 'errors.validation.requiredField'),
    businessName: z.string().min(1, 'errors.validation.requiredField'),
    cuil: z.string().optional(),
    enrollment: z.string().optional(),
    profesionGrado: z.array(profesionGradoSchema).optional(),
});

const patientSubSchema = z.object({
    firstName: z.string().min(1, 'errors.validation.requiredField'),
    lastName: z.string().min(1, 'errors.validation.requiredField'),
    dni: z.string().optional(),
    sex: z.string().min(1, 'errors.validation.requiredField'),
    nombreAutopercibido: z.string().optional(),
    fechaNac: z.string().optional(),
    idMPI: z.string().optional(),
    obraSocial: z.object({
        nombre: z.string().optional(),
        numeroAfiliado: z.string().optional(),
    }).optional(),
});

export const createCertificateSchema = z.object({
    patient: patientSubSchema,
    professional: professionalSchema,
    certificate: z.string().optional(),
    startDate: z.string().min(1, 'errors.validation.requiredField'),
    cantDias: z.number().int().positive('errors.validation.requiredField'),
});

export const updateCertificateSchema = z.object({
    anulateReason: z.string().optional(),
    anulateDate: z.string().optional(),
    status: z.literal('anulado').optional(),
});

export const searchCertificateSchema = z.object({
    searchTerm: z.string().min(1, 'errors.validation.requiredField'),
    skip: z.coerce.number().int().nonnegative().optional(),
    limit: z.coerce.number().int().positive().optional(),
});

export type CreateCertificateDTO = z.infer<typeof createCertificateSchema>;
export type UpdateCertificateDTO = z.infer<typeof updateCertificateSchema>;
export type SearchCertificateDTO = z.infer<typeof searchCertificateSchema>;
