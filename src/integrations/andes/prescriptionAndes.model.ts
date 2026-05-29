import mongoose from 'mongoose';
import { IPrescriptionAndes } from './prescriptionAndes.types';

const andesPrescriptionSchema = new mongoose.Schema({
    idAndes: { type: String, index: true },
    profesionalId: { type: String, index: true },
    organizacion: {
        _id: String,
        nombre: String,
    },
    profesional: {
        id: String,
        nombre: String,
        apellido: String,
        documento: String,
    },
    paciente: {
        id: String,
        nombre: String,
        apellido: String,
        documento: String,
        sexo: String,
        fechaNacimiento: String,
    },
    concepto: {
        conceptId: String,
        term: String,
    },
    recetaTipo: String,
    estadoActual: {
        tipo: String,
        createdAt: String,
    },
    estadoDispensaActual: {
        tipo: String,
    },
    dispensa: [{
        _id: false,
        descripcion: String,
        cantidad: Number,
        organizacion: {
            id: String,
            nombre: String,
        },
    }],
}, { timestamps: true });

andesPrescriptionSchema.index({ 'estadoActual.tipo': 1 });
andesPrescriptionSchema.index({ 'estadoDispensaActual.tipo': 1 });

const PrescriptionAndes = mongoose.models.PrescriptionAndes
    || mongoose.model<IPrescriptionAndes>('PrescriptionAndes', andesPrescriptionSchema);

export default PrescriptionAndes;
