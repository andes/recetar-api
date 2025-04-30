import { Schema, model, Model } from 'mongoose';
import IObraSocial from '../interfaces/obraSocial.interface';

// Schema
export const obraSocialSchema = new Schema({
    codigoPuco: {
        type: Number,
        required: true
    },
    nombre: {
        type: String,
        required: true
    },
    financiador: {
        type: String,
        required: false
    },
    prepaga: {
        type: Boolean,
        required: false
    },
    idObraSocial: {
        type: Number,
        required: false
    },
    numeroAfiliado: {
        type: String,
        required: false
    }

});

// Model
const ObraSocial: Model<IObraSocial> = model<IObraSocial>('ObraSocial', obraSocialSchema);

export default ObraSocial;