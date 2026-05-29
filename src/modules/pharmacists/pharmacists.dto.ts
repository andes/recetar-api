import { z } from 'zod';

export const createPharmacistSchema = z.object({
    enrollment: z.string().min(1, 'errors.validation.requiredField'),
    lastName: z.string().min(1, 'errors.validation.requiredField'),
    firstName: z.string().min(1, 'errors.validation.requiredField'),
    sex: z.enum(['Femenino', 'Masculino', 'Otro'], { message: 'errors.validation.invalidSex' }),
    image: z.string().optional(),
});

export const updatePharmacistSchema = z.object({
    enrollment: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    firstName: z.string().min(1).optional(),
    sex: z.enum(['Femenino', 'Masculino', 'Otro'], { message: 'errors.validation.invalidSex' }).optional(),
    image: z.string().optional(),
});

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createPharmacySchema = z.object({
    cuit: z.string().min(1, 'errors.validation.requiredField'),
    name: z.string().min(1, 'errors.validation.requiredField'),
    city: z.string().min(1, 'errors.validation.requiredField'),
    pharmacist: z.string().regex(objectIdRegex, 'errors.validation.invalidObjectId'),
    address: z.string().optional(),
    image: z.string().optional(),
});

export const updatePharmacySchema = z.object({
    cuit: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    pharmacist: z.string().regex(objectIdRegex, 'errors.validation.invalidObjectId').optional(),
    address: z.string().optional(),
    image: z.string().optional(),
});

export type CreatePharmacistDTO = z.infer<typeof createPharmacistSchema>;
export type UpdatePharmacistDTO = z.infer<typeof updatePharmacistSchema>;
export type CreatePharmacyDTO = z.infer<typeof createPharmacySchema>;
export type UpdatePharmacyDTO = z.infer<typeof updatePharmacySchema>;
