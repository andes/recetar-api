import { z } from 'zod';

const praxisPacienteSchema = z.object({
    nombre: z.string().min(1, 'errors.validation.requiredField'),
    apellido: z.string().min(1, 'errors.validation.requiredField'),
    tipoDocumento: z.string().default('DNI'),
    numeroDocumento: z.number().positive('errors.validation.invalidNumber'),
    fechaNacimiento: z.string().min(1, 'errors.validation.requiredField'),
    sexo: z.enum(['M', 'F', 'X'], { message: 'errors.validation.invalidSex' }),
    cuil: z.number().optional(),
});

const praxisCoberturaSchema = z.object({
    idObraSocial: z.number(),
    idConvenio: z.number().optional(),
    numeroAfiliado: z.string().min(1, 'errors.validation.requiredField'),
    codigoPlan: z.string().optional(),
    nombrePlan: z.string().optional(),
});

const praxisPrescriptorSchema = z.object({
    matricula: z.string().min(1, 'errors.validation.requiredField'),
    tipoMatricula: z.enum(['N', 'P']).default('N'),
    idProvinciaMatricula: z.string().default('C'),
    tipoPrescriptor: z.enum(['M', 'O']).default('M'),
});

const praxisDiagnosticoSchema = z.object({
    descripcion: z.string().min(1, 'errors.validation.requiredField'),
    codigoCIE10: z.string().min(1, 'errors.validation.requiredField'),
});

const praxisProductoSchema = z.object({
    codigoAlfabeta: z.number().optional(),
    codigoBarras: z.string().max(13).optional(),
});

const praxisRenglonSchema = z.object({
    tipoPrescripcion: z.enum(['G', 'M'], { message: 'errors.validation.invalidPrescriptionType' }),
    producto: praxisProductoSchema,
    cantidadEnvases: z.number().min(1, 'errors.validation.invalidQuantity'),
    diagnostico: praxisDiagnosticoSchema,
    indicaciones: z.string().optional(),
    observaciones: z.string().optional(),
});

export const createPraxisPrescriptionSchema = z.object({
    paciente: praxisPacienteSchema,
    coberturaSalud: praxisCoberturaSchema.optional(),
    prescriptor: praxisPrescriptorSchema,
    renglones: z.array(praxisRenglonSchema).min(1, 'errors.validation.requiredField'),
    tratamientoProlongado: z.boolean().default(false),
});

export type CreatePraxisPrescriptionDTO = z.infer<typeof createPraxisPrescriptionSchema>;
export type PraxisPacienteDTO = z.infer<typeof praxisPacienteSchema>;
export type PraxisCoberturaDTO = z.infer<typeof praxisCoberturaSchema>;
export type PraxisPrescriptorDTO = z.infer<typeof praxisPrescriptorSchema>;
export type PraxisRenglonDTO = z.infer<typeof praxisRenglonSchema>;
