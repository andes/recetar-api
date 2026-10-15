import { z } from 'zod';

const snomedConceptSchema = z.object({
    conceptId: z.string().optional(),
    term: z.string().optional(),
}).optional();

export const andesIngestSchema = z.object({
    idPrestacion: z.string().min(1, 'errors.validation.requiredField'),
    idRegistro: z.string().min(1, 'errors.validation.requiredField'),
    fechaRegistro: z.string().optional(),
    paciente: z.object({
        id: z.string().optional(),
        nombre: z.string().optional(),
        apellido: z.string().optional(),
        documento: z.string().optional(),
        sexo: z.string().optional(),
        fechaNacimiento: z.string().optional(),
        obraSocial: z.object({
            nombre: z.string().optional(),
            numeroAfiliado: z.string().optional(),
        }).optional(),
    }).optional(),
    profesional: z.object({
        id: z.string().optional(),
        nombre: z.string().optional(),
        apellido: z.string().optional(),
        documento: z.string().optional(),
        matricula: z.string().optional(),
    }).optional(),
    organizacion: z.object({
        id: z.string().optional(),
        nombre: z.string().optional(),
    }).optional(),
    diagnostico: z.string().optional(),
    medicamento: z.object({
        concepto: snomedConceptSchema,
        generico: snomedConceptSchema,
        presentacion: z.string().optional(),
        cantidad: z.number().optional(),
        cantEnvases: z.number().optional(),
        dosisDiaria: z.object({
            notaMedica: z.string().optional(),
        }).optional(),
        tratamientoProlongado: z.boolean().optional(),
        tiempoTratamiento: z.object({
            id: z.string().optional(),
            nombre: z.string().optional(),
        }).optional(),
        esMagistral: z.boolean().optional(),
        magistral: z.object({
            nombre: z.string().optional(),
        }).optional(),
    }).optional(),
});

export type AndesIngestDTO = z.infer<typeof andesIngestSchema>;
