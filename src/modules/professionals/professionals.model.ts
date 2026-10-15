import { Schema, Model, model } from 'mongoose';
import { IProfessional } from './professionals.types';

const profesionGradoSubSchema = new Schema({
    profesion: { type: String, required: true },
    codigoProfesion: { type: String, required: true },
    numeroMatricula: { type: String, required: true },
    vencimiento: { type: Date },
    estado: {
        type: String,
        enum: ['vigente', 'vencida', 'suspendida', 'sin-matricula', 'baja'],
    },
}, { _id: false });

const professionalSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    tipoDocumento: { type: String, default: 'DNI' },
    documento: { type: String, required: true, unique: true, index: true },
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    sexo: { type: String },
    cuit: { type: String },
    profesionGrado: { type: [profesionGradoSubSchema], default: [] },
    actualizadoEn: { type: Date, default: Date.now },
}, { timestamps: true });

const Professional: Model<IProfessional> = model<IProfessional>('Professional', professionalSchema);

export default Professional;
