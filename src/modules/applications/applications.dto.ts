import { z } from 'zod';

const applicationOrganizationSchema = z.object({
    _id: z.string().optional(),
    nombre: z.string().optional(),
});

export const createApplicationSchema = z.object({
    nombre: z.string().min(1, 'errors.validation.requiredField'),
    organizacion: applicationOrganizationSchema.optional(),
    permisos: z.array(z.string()).default([]),
});

export const issueApplicationTokenSchema = z.object({
    expiresInHours: z.number().int().positive().optional(),
}).default({});

export type CreateApplicationDTO = z.infer<typeof createApplicationSchema>;
export type IssueApplicationTokenDTO = z.infer<typeof issueApplicationTokenSchema>;
