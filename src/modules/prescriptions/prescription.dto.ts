import { z } from 'zod';

const snomedConceptSchema = z.object({
    conceptId: z.string().optional(),
    term: z.string().optional(),
    fsn: z.string().optional(),
    semanticTag: z.string().optional(),
});

const supplyCodeSchema = z.object({
    source: z.enum(['SIFAHO', 'SNOMED']).optional(),
    value: z.string().optional(),
});

const supplySchema = z.object({
    name: z.string().optional(),
    snomedConcept: snomedConceptSchema.optional(),
    code: supplyCodeSchema.optional(),
    type: z.enum(['device', 'nutrition', 'magistral']).optional(),
    requiresSpecification: z.boolean().optional(),
    specification: z.string().optional(),
});

const supplyEntrySchema = z.object({
    supply: supplySchema,
    quantity: z.number().optional(),
    quantityPresentation: z.number().optional(),
    diagnostic: z.string().optional(),
    indication: z.string().optional(),
    duplicate: z.boolean().optional(),
    triplicate: z.boolean().optional(),
    triplicateData: z.object({
        serie: z.string().optional(),
        numero: z.number().optional(),
    }).optional(),
});

export const createPrescriptionSchema = z.object({
    patient: z.object({
        firstName: z.string().min(1, 'errors.validation.requiredField'),
        lastName: z.string().min(1, 'errors.validation.requiredField'),
        dni: z.string().min(1, 'errors.validation.requiredField'),
        sex: z.string().min(1, 'errors.validation.requiredField'),
        obraSocial: z.object({
            nombre: z.string().optional(),
            numeroAfiliado: z.string().optional(),
        }).optional(),
        fechaNac: z.string().optional(),
        idMPI: z.string().optional(),
    }),
    professional: z.object({
        userId: z.string().min(1, 'errors.validation.requiredField'),
        businessName: z.string().min(1, 'errors.validation.requiredField'),
        cuil: z.string().optional(),
        enrollment: z.string().optional(),
    }),
    supplies: z.array(supplyEntrySchema).min(1, 'errors.validation.invalidSupplies'),
    ambito: z.enum(['publico', 'privado']).optional(),
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
});

export const cancelDispensePrescriptionSchema = z.object({
    reason: z.string().optional(),
});

export type CreatePrescriptionDTO = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionDTO = z.infer<typeof updatePrescriptionSchema>;
export type DispensePrescriptionDTO = z.infer<typeof dispensePrescriptionSchema>;
export type CancelDispensePrescriptionDTO = z.infer<typeof cancelDispensePrescriptionSchema>;
