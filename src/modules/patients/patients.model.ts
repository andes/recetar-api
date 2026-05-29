import { Schema, model, Model } from 'mongoose';
import { IPatient } from './patients.types';

export const obraSocialSchema = new Schema({
    codigoPuco: { type: Number },
    nombre: { type: String },
    financiador: { type: String },
    prepaga: { type: Boolean },
    idObraSocial: { type: Number },
    numeroAfiliado: { type: String },
});

export const patientSubSchema = new Schema({
    firstName: { type: String, required: '{PATH} is required' },
    lastName: { type: String, required: '{PATH} is required' },
    nombreAutopercibido: { type: String, default: '' },
    dni: { type: String, default: '' },
    fechaNac: { type: Date, default: null },
    sex: { type: String, enum: ['Femenino', 'Masculino', 'Otro'], required: '{PATH} is required' },
    obraSocial: {
        nombre: { type: String, default: '' },
        numeroAfiliado: { type: String, default: '' },
    },
    idMPI: { type: String, default: '' },
}, { _id: false });

export const patientSchema = new Schema({
    dni: { type: String },
    lastName: { type: String, required: '{PATH} is required' },
    firstName: { type: String, required: '{PATH} is required' },
    sex: { type: String, enum: ['Femenino', 'Masculino', 'Otro'], required: '{PATH} is required' },
    status: { type: String, enum: ['Validado', 'Temporal'] },
    genero: { type: String },
    nombreAutopercibido: { type: String, default: '' },
    idMPI: { type: String, default: '' },
    tipoDocumentoExtranjero: { type: String, default: '' },
    nroDocumentoExtranjero: { type: String, default: '' },
    obraSocial: { type: obraSocialSchema, default: null },
    estado: { type: String, enum: ['validado', 'temporal', 'recienNacido', 'extranjero', null] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    fechaNac: { type: Date, default: null },
    idLocalInMPI: { type: Boolean, default: false },
    cuil: { type: String, default: null },
});

const Patient: Model<IPatient> = model<IPatient>('Patient', patientSchema);

export default Patient;
