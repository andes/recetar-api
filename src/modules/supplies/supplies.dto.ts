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

export const createSupplySchema = z.object({
    name: z.string().min(1, 'errors.validation.requiredField'),
    activePrinciple: z.string().optional(),
    pharmaceutical_form: z.string().optional(),
    power: z.string().optional(),
    unity: z.string().optional(),
    firstPresentation: z.string().optional(),
    secondPresentation: z.string().optional(),
    snomedConcept: snomedConceptSchema.optional(),
    code: supplyCodeSchema.optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

export const updateSupplySchema = z.object({
    name: z.string().min(1).optional(),
    activePrinciple: z.string().optional(),
    pharmaceutical_form: z.string().optional(),
    power: z.string().optional(),
    unity: z.string().optional(),
    firstPresentation: z.string().optional(),
    secondPresentation: z.string().optional(),
    snomedConcept: snomedConceptSchema.optional(),
    code: supplyCodeSchema.optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

export type CreateSupplyDTO = z.infer<typeof createSupplySchema>;
export type UpdateSupplyDTO = z.infer<typeof updateSupplySchema>;
