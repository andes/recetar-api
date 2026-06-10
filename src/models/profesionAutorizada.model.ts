import { Schema, Model, model, Document } from 'mongoose';

export interface IProfesionAutorizada extends Document {
    profesion: string;
    codigoProfesion: string;
}

const profesionAutorizadaSchema = new Schema({
    profesion: {
        type: String,
        required: '{PATH} is required',
    },
    codigoProfesion: {
        type: String,
        required: '{PATH} is required',
    },
});

const ProfesionAutorizada: Model<IProfesionAutorizada> = model<IProfesionAutorizada>(
    'ProfesionAutorizada',
    profesionAutorizadaSchema,
    'profesionautorizada',
);

export default ProfesionAutorizada;
