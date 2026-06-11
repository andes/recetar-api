import { z } from 'zod';

export const TREATMENT_MIN_MONTHS = 2;
export const TREATMENT_MAX_MONTHS = 12;

const supplyCodeSchema = z.object({
    source: z.enum(['SIFAHO', 'SNOMED', 'ALFABETA', 'ANDES']).optional(),
    value: z.string().optional(),
});

const supplySchema = z.object({
    name: z.string().optional(),
    code: supplyCodeSchema.optional(),
    type: z.enum(['device', 'nutrition', 'magistral']).optional(),
    requiresSpecification: z.boolean().optional(),
    specification: z.string().optional(),
    activePrinciple: z.string().optional(),
    power: z.string().optional(),
    firstPresentation: z.string().optional(),
    barCode: z.string().optional(),
});

const supplyEntrySchema = z.object({
    supply: supplySchema,
    quantity: z.number().optional(),
    quantityPresentation: z.number().optional(),
    diagnostic: z.string().optional(),
    indication: z.string().optional(),
    duplicate: z.boolean().optional(),
    triplicate: z.boolean().optional(),
    tratamientoProlongado: z.number().int().min(TREATMENT_MIN_MONTHS).max(TREATMENT_MAX_MONTHS).optional(),
    triplicateData: z.object({
        serie: z.string().optional(),
        numero: z.number().optional(),
    }).optional(),
    obraSocial: z.object({
        nombre: z.string().optional(),
        codigoPuco: z.number().optional(),
        numeroAfiliado: z.string().optional(),
    }).optional(),
});

export const createPrescriptionSchema = z.object({
    patient: z.object({
        firstName: z.string().min(1, 'errors.validation.requiredField'),
        lastName: z.string().min(1, 'errors.validation.requiredField'),
        dni: z.string().min(1, 'errors.validation.requiredField'),
        sex: z.string().min(1, 'errors.validation.requiredField'),
        fechaNac: z.string().optional(),
        idMPI: z.string().nullable().optional(),
    }),
    professional: z.object({
        userId: z.string().min(1, 'errors.validation.requiredField'),
        businessName: z.string().min(1, 'errors.validation.requiredField'),
        cuil: z.string().optional(),
        enrollment: z.string().optional(),
        profesionGrado: z.array(z.object({
            profesion: z.string().optional(),
            codigoProfesion: z.string().optional(),
            numeroMatricula: z.string().optional(),
        })).optional(),
    }),
    supplies: z.array(supplyEntrySchema).min(1, 'errors.validation.invalidSupplies'),
    ambito: z.enum(['publico', 'privado']).optional(),
    // Fallback deprecado: aplica a todos los medicamentos que no definan su propio `tratamientoProlongado`.
    // Se recomienda enviarlo por supply. Ignora insumos.
    tratamientoProlongado: z.number().int().min(TREATMENT_MIN_MONTHS).max(TREATMENT_MAX_MONTHS).optional(),
    // Alias legacy: el cliente viejo envía `trimestral`. Se traduce a 3 meses (fallback) y no se persiste.
    trimestral: z.boolean().optional(),
    date: z.string().optional(),
    organizacion: z.object({
        _id: z.string().optional(),
        nombre: z.string().optional(),
        direccion: z.string().optional(),
    }).optional(),
});

export const updatePrescriptionSchema = z.object({
    supplies: z.array(supplyEntrySchema).optional(),
    date: z.string().optional(),
    organizacion: z.object({
        _id: z.string().optional(),
        nombre: z.string().optional(),
        direccion: z.string().optional(),
    }).optional(),
});

export const dispensePrescriptionSchema = z.object({
    userId: z.string().min(1, 'errors.validation.requiredField'),
    businessName: z.string().min(1, 'errors.validation.requiredField'),
    cuil: z.string().optional(),
    replacement: z.object({
        name: z.string().optional(),
        quantity: z.number().optional(),
    }).optional(),
});

export const cancelDispensePrescriptionSchema = z.object({
    reason: z.string().optional(),
});

export type CreatePrescriptionDTO = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionDTO = z.infer<typeof updatePrescriptionSchema>;
export type DispensePrescriptionDTO = z.infer<typeof dispensePrescriptionSchema>;
export type CancelDispensePrescriptionDTO = z.infer<typeof cancelDispensePrescriptionSchema>;
