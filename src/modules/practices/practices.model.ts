import mongoose from 'mongoose';
import { IPractice } from './practices.types';

const profesionGradoSubSchema = new mongoose.Schema({
    profesion: { type: String, required: true },
    codigoProfesion: { type: String, required: true },
    numeroMatricula: { type: String, required: true },
}, { _id: false });

const professionalSubSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    enrollment: { type: String },
    cuil: { type: String },
    businessName: { type: String },
    profesionGrado: { type: [profesionGradoSubSchema], default: [] },
}, { _id: false });

const obraSocialSubSchema = new mongoose.Schema({
    nombre: { type: String },
    codigoPuco: { type: String },
    numeroAfiliado: { type: String },
}, { _id: false });

const patientSubSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dni: { type: String, required: true },
    sex: { type: String, required: true },
    obraSocial: { type: obraSocialSubSchema, default: null },
}, { _id: false });

const practiceSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    patient: { type: patientSubSchema, required: true },
    professional: { type: professionalSubSchema, required: true },
    practice: { type: String },
    diagnostic: { type: String },
    indications: { type: String },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
}, { timestamps: true });

const Practice: mongoose.Model<IPractice> = mongoose.model<IPractice>('Practice', practiceSchema);

export default Practice;
