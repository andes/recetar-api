import { z } from 'zod';

const praxysPacienteSchema = z.object({
    nombre: z.string().min(1, 'errors.validation.requiredField'),
    apellido: z.string().min(1, 'errors.validation.requiredField'),
    tipoDocumento: z.string().default('DNI'),
    numeroDocumento: z.number().positive('errors.validation.invalidNumber'),
    fechaNacimiento: z.string().min(1, 'errors.validation.requiredField'),
    sexo: z.enum(['M', 'F', 'X'], { message: 'errors.validation.invalidSex' }),
    cuil: z.number().optional(),
});

const praxysCoberturaSchema = z.object({
    idObraSocial: z.number(),
    idConvenio: z.number().optional(),
    numeroAfiliado: z.string().min(1, 'errors.validation.requiredField'),
    codigoPlan: z.string().optional(),
    nombrePlan: z.string().optional(),
});

const praxysPrescriptorSchema = z.object({
    matricula: z.string().min(1, 'errors.validation.requiredField'),
    tipoMatricula: z.enum(['N', 'P']).default('N'),
    idProvinciaMatricula: z.string().default('C'),
    tipoPrescriptor: z.enum(['M', 'O']).default('M'),
});

const praxysDiagnosticoSchema = z.object({
    descripcion: z.string().min(1, 'errors.validation.requiredField'),
    codigoCIE10: z.string().min(1, 'errors.validation.requiredField'),
});

const praxysProductoSchema = z.object({
    codigoAlfabeta: z.number().optional(),
    codigoBarras: z.string().max(13).optional(),
});

const praxysRenglonSchema = z.object({
    tipoPrescripcion: z.enum(['G', 'M'], { message: 'errors.validation.invalidPrescriptionType' }),
    producto: praxysProductoSchema,
    cantidadEnvases: z.number().min(1, 'errors.validation.invalidQuantity'),
    diagnostico: praxysDiagnosticoSchema,
    indicaciones: z.string().optional(),
    observaciones: z.string().optional(),
});

export const createPraxysPrescriptionSchema = z.object({
    paciente: praxysPacienteSchema,
    coberturaSalud: praxysCoberturaSchema.optional(),
    prescriptor: praxysPrescriptorSchema,
    renglones: z.array(praxysRenglonSchema).min(1, 'errors.validation.requiredField'),
    tratamientoProlongado: z.boolean().default(false),
    idAtencion: z.string().optional(),
    recetas: z.object({
        cantidadRecetas: z.number().int().min(1),
        cantidadDiasEntreRecetas: z.number().int().min(1),
    }).optional(),
    fechaPrescripcion: z.string().optional(),
});

export type CreatePraxysPrescriptionDTO = z.infer<typeof createPraxysPrescriptionSchema>;
export type PraxysPacienteDTO = z.infer<typeof praxysPacienteSchema>;
export type PraxysCoberturaDTO = z.infer<typeof praxysCoberturaSchema>;
export type PraxysPrescriptorDTO = z.infer<typeof praxysPrescriptorSchema>;
export type PraxysRenglonDTO = z.infer<typeof praxysRenglonSchema>;
