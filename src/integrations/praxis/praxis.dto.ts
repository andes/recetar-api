import { z } from 'zod';

const praxisPacienteSchema = z.object({
    nombre: z.string().min(1, 'errors.validation.requiredField'),
    apellido: z.string().min(1, 'errors.validation.requiredField'),
    tipoDocumento: z.string().default('DNI'),
    numeroDocumento: z.number().positive('errors.validation.invalidNumber'),
    fechaNacimiento: z.string().min(1, 'errors.validation.requiredField'),
    sexo: z.enum(['M', 'F'], { message: 'errors.validation.invalidSex' }),
    cuil: z.number().optional(),
});

const praxisCoberturaSchema = z.object({
    idObraSocial: z.number(),
    idConvenio: z.number(),
    numeroAfiliado: z.string().min(1, 'errors.validation.requiredField'),
    codigoPlan: z.string().min(1, 'errors.validation.requiredField'),
    nombrePlan: z.string().min(1, 'errors.validation.requiredField'),
});

const praxisPrescriptorSchema = z.object({
    matricula: z.string().min(1, 'errors.validation.requiredField'),
    tipoMatricula: z.string().default('N'),
    idProvinciaMatricula: z.string().default('C'),
    tipoPrescriptor: z.string().default('M'),
});

const praxisDiagnosticoSchema = z.object({
    descripcion: z.string().min(1, 'errors.validation.requiredField'),
    codigoCIE10: z.string().min(1, 'errors.validation.requiredField'),
});

const praxisProductoSchema = z.object({
    codigoAlfabeta: z.number().positive('errors.validation.invalidNumber'),
    codigoBarras: z.string().min(1, 'errors.validation.requiredField'),
});

const praxisRenglonSchema = z.object({
    tipoPrescripcion: z.enum(['G', 'M'], { message: 'errors.validation.invalidPrescriptionType' }),
    producto: praxisProductoSchema,
    cantidadEnvases: z.number().min(1, 'errors.validation.invalidQuantity'),
    diagnostico: praxisDiagnosticoSchema,
    indicaciones: z.string().min(1, 'errors.validation.requiredField'),
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
