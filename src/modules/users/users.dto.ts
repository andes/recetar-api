import { z } from 'zod';

export const listUsersSchema = z.object({
    searchTerm: z.string().optional(),
    offset: z.coerce.number().int().min(0).default(0).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});
export type ListUsersDTO = z.infer<typeof listUsersSchema>;


export const createUserSchema = z.object({
    email: z.email({ error: 'errors.validation.invalidEmail' }).optional().or(z.literal('')),
    username: z.string({ error: 'errors.validation.invalidUsername' }).min(1, 'errors.validation.invalidUsername').optional(),
    password: z.string({ error: 'errors.validation.passwordMin' }).min(8, 'errors.validation.passwordMin'),
    businessName: z.string({ error: 'errors.validation.invalidBusinessName' }).optional(),
    enrollment: z.string({ error: 'errors.validation.invalidEnrollment' }).optional(),
    cuil: z.string({ error: 'errors.validation.invalidCuil' }).optional(),
    roles: z.array(z.string({ error: 'errors.validation.invalidRole' })).min(1, 'errors.validation.rolesRequired'),
    idAndes: z.string().optional(),
    profesionGrado: z.array(z.object({
        profesion: z.string(),
        codigoProfesion: z.string(),
        numeroMatricula: z.string(),
        vencimiento: z.string().optional(),
    })).optional(),
    authorizationExpiration: z.string().optional(),
    authorizationDisposition: z.string().optional(),
    responsibleDTEnrollment: z.string().optional(),
});
export type CreateUserDTO = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
    email: z.email({ error: 'errors.validation.invalidEmail' }).optional(),
    username: z.string({ error: 'errors.validation.invalidUsername' }).min(1, 'errors.validation.invalidUsername').optional(),
    businessName: z.string({ error: 'errors.validation.invalidBusinessName' }).optional(),
    enrollment: z.string({ error: 'errors.validation.invalidEnrollment' }).optional(),
    cuil: z.string({ error: 'errors.validation.invalidCuil' }).optional(),
    roles: z.array(z.string({ error: 'errors.validation.invalidRole' })).optional(),
    isActive: z.boolean().optional(),
    idAndes: z.string().optional(),
    profesionGrado: z.array(z.object({
        profesion: z.string(),
        codigoProfesion: z.string(),
        numeroMatricula: z.string(),
        vencimiento: z.string().optional(),
    })).optional(),
    authorizationExpiration: z.string().optional(),
    authorizationDisposition: z.string().optional(),
    responsibleDTEnrollment: z.string().optional(),
});
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;

export const requestEmailUpdateSchema = z.object({
    email: z.string().email('Email inválido'),
});
export type RequestEmailUpdateDTO = z.infer<typeof requestEmailUpdateSchema>;

export const confirmEmailUpdateSchema = z.object({
    token: z.string().min(1, 'Token requerido'),
});
export type ConfirmEmailUpdateDTO = z.infer<typeof confirmEmailUpdateSchema>;

export const updateOwnOrganizacionesSchema = z.object({
    organizaciones: z.array(z.object({
        _id: z.string().optional(),
        nombre: z.string(),
        direccion: z.string().optional(),
        provincia: z.string().optional(),
        ambito: z.enum(['publico', 'privado']).optional(),
    })),
});
export type UpdateOwnOrganizacionesDTO = z.infer<typeof updateOwnOrganizacionesSchema>;

export const addSisaOrganizacionSchema = z.object({
    codigo: z.string().min(1),
});

export const organizacionesAndesSchema = z.object({
    nombre: z.string().min(1, 'Parámetro nombre es requerido'),
});
export type OrganizacionesAndesDTO = z.infer<typeof organizacionesAndesSchema>;
