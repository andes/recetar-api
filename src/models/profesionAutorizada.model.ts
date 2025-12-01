import { Schema, Model, model } from 'mongoose';
import IProfesionAutorizada from '../interfaces/profesionAutorizada.interface';

// Schema
const profesionAutorizadaSchema = new Schema({
  profesion: {
    type: String,
    required: '{PATH} is required'
  },
  codigoProfesion: {
    type: String,
    required: '{PATH} is required'
  }
});

// Model
const ProfesionAutorizada: Model<IProfesionAutorizada> = model<IProfesionAutorizada>('ProfesionAutorizada', profesionAutorizadaSchema, 'profesionautorizada');

export default ProfesionAutorizada;