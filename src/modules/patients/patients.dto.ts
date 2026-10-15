import { z } from 'zod';

const dniSchema = z.string()
    .trim()
    .max(11, 'errors.validation.invalidDni')
    .refine((value) => value === '' || /^\d{6,11}$/.test(value), 'errors.validation.invalidDni')
    .optional();

const contactoSchema = z.object({
    tipo: z.enum(['fijo', 'celular', 'email', 'extranjero']),
    valor: z.string(),
    ranking: z.number().optional(),
    activo: z.boolean().optional(),
});

const direccionSchema = z.object({
    calle: z.string().optional(),
    codigoPostal: z.string().optional(),
    barrio: z.string().optional(),
    localidad: z.string().optional(),
    provincia: z.string().optional(),
    pais: z.string().optional(),
    ranking: z.number().optional(),
    activo: z.boolean().optional(),
});

const generoSchema = z.string()
    .trim()
    .optional()
    .transform((value) => {
        const normalized = (value || '').toLowerCase();
        if (!normalized || ['ninguno', 'ninguna', 'none'].includes(normalized)) {
            return undefined;
        }
        return value;
    });

export const createPatientSchema = z.object({
    dni: dniSchema,
    sex: z.enum(['Femenino', 'Masculino', 'Otro'], { message: 'errors.validation.invalidSex' }),
    firstName: z.string().min(1, 'errors.validation.requiredField').optional(),
    lastName: z.string().min(1, 'errors.validation.requiredField').optional(),
    fechaNac: z.string().optional(),
    nombreAutopercibido: z.string().optional(),
    genero: generoSchema,
    cuil: z.string().optional(),
    contactos: z.array(contactoSchema).optional(),
    direcciones: z.array(direccionSchema).optional(),
}).refine(
    (data) => !!data.dni || (!!data.firstName?.trim() && !!data.lastName?.trim()),
    {
        message: 'errors.validation.nameRequiredWithoutDni',
        path: ['firstName'],
    },
);

export const updatePatientSchema = z.object({
    dni: dniSchema,
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    sex: z.enum(['Femenino', 'Masculino', 'Otro'], { message: 'errors.validation.invalidSex' }).optional(),
    fechaNac: z.string().optional(),
    nombreAutopercibido: z.string().optional(),
    genero: generoSchema,
    cuil: z.string().optional(),
    contactos: z.array(contactoSchema).optional(),
    direcciones: z.array(direccionSchema).optional(),
});

export const searchPatientsSchema = z.object({
    q: z.string().optional(),
    estado: z.string().optional(),
    sexo: z.string().optional(),
    email: z.string().optional(),
    celular: z.string().optional(),
    fijo: z.string().optional(),
    offset: z.coerce.number().int().min(0).default(0).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
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
export type SearchPatientsDTO = z.infer<typeof searchPatientsSchema>;
export type GetByDniDTO = z.infer<typeof getByDniSchema>;
export type GetCoverageDTO = z.infer<typeof getCoverageSchema>;
