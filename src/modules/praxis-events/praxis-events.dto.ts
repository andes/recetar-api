import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const optionalText = z.preprocess(emptyToUndefined, z.string().optional());
const optionalNumber = z.preprocess(emptyToUndefined, z.number().int().optional());

const productoEventoSchema = z.object({
    descripcion: optionalText,
    codigoBarras: optionalText,
    troquel: optionalNumber,
    codigoAlfabeta: optionalNumber,
});

const genericoEventoSchema = z.object({
    drogas: optionalText,
    presentacion: optionalText,
});

const diagnosticoEventoSchema = z.object({
    descripcion: optionalText,
    cie10: optionalText,
    ciE10: optionalText,
    codigoCIE10: optionalText,
});

const renglonEventoSchema = z.object({
    numeroRenglon: optionalNumber,
    tipoPrescripcion: optionalText,
    generico: genericoEventoSchema.optional(),
    producto: productoEventoSchema.optional(),
    cantidadEnvases: z.number().int().min(1),
    diagnostico: diagnosticoEventoSchema.optional(),
    indicaciones: optionalText,
    cuir: optionalText,
});

const recetaEventoSchema = z.object({
    hash: z.string().min(1).max(64),
    fecha: optionalText,
    numero: optionalText,
    fechaAnulacion: optionalText,
    id: optionalNumber,
});

const prescriptorEventoSchema = z.object({
    nombre: optionalText,
    matricula: z.string().min(1),
    tipoMatricula: optionalText,
    idProvinciaMatricula: optionalText,
    cuit: optionalText,
    idOrganizacion: optionalNumber,
});

const obraSocialEventoSchema = z.object({
    nombre: optionalText,
    codigoRNOS: optionalNumber,
});

const beneficiarioEventoSchema = z.object({
    numero: optionalText,
    nombre: optionalText,
    tipoDocumento: optionalText,
    numeroDocumento: optionalNumber,
    correo: optionalText,
    celular: optionalText,
    cuil: optionalNumber,
});

export const praxisPrescriptionEventSchema = z.object({
    id: optionalNumber,
    hash: z.string().min(1).max(64),
    fecha: optionalText,
    idAtencion: z.preprocess(emptyToUndefined, z.string().min(1).max(64).optional()),
    prescriptor: prescriptorEventoSchema.optional(),
    obraSocial: obraSocialEventoSchema.optional(),
    beneficiario: beneficiarioEventoSchema.optional(),
    tratamientoProlongado: z.boolean().optional().default(false),
    recetas: z.array(recetaEventoSchema).min(1),
    renglones: z.array(renglonEventoSchema).min(1),
});

const dispensaRenglonSchema = z.object({
    producto: productoEventoSchema.optional(),
    cantidadEnvases: z.number().int().min(1),
});

export const praxisDispensationEventSchema = z.object({
    fecha: optionalText,
    beneficiario: z.object({ numero: optionalText }).optional(),
    receta: z.object({
        fecha: optionalText,
        numero: optionalText,
    }).optional(),
    dispensa: z.object({
        numeroAutorizacion: z.string().min(1).max(20),
        renglones: z.array(dispensaRenglonSchema).min(1),
    }),
});

export const praxisHashParamSchema = z.object({
    hash: z.string().min(1).max(64),
});

export type PraxisPrescriptionEventDTO = z.infer<typeof praxisPrescriptionEventSchema>;
export type PraxisDispensationEventDTO = z.infer<typeof praxisDispensationEventSchema>;
export type PraxisHashParamDTO = z.infer<typeof praxisHashParamSchema>;
