import mongoose, { Schema, Model, model } from 'mongoose';
import { IProfessional } from './professionals.types';

const professionalSchema = new Schema({
    dni: { type: String },
    enrollment: { type: String, required: '{PATH} is required', unique: true, index: true },
    lastName: { type: String, required: '{PATH} is required' },
    firstName: { type: String, required: '{PATH} is required' },
    sex: { type: String, enum: ['Femenino', 'Masculino', 'Otro'] },
    image: { type: String },
}, { timestamps: true });

const Professional: Model<IProfessional> = model<IProfessional>('Professional', professionalSchema);

export default Professional;
