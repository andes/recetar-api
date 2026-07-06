import { Schema, Model, model } from 'mongoose';
import ISupply from '../interfaces/supply.interface';

// Schema
export const supplySchema = new Schema({

    name: {
        type: String,
        required: '{PATH} is required'
    },
    activePrinciple: {
        type: String
    },
    pharmaceutical_form: {
        type: String
    },
    power: {
        type: String
    },
    unity: {
        type: String
    },
    firstPresentation: {
        type: String
    },
    secondPresentation: {
        type: String
    },
    code: Schema.Types.Mixed,
    codigo: Schema.Types.Mixed,
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    snomedConcept: {
        conceptId: String,
        term: String,
        fsn: String,
        semanticTag: String
    },
    description: {
        type: String
    }
}, {
    timestamps: true
});

// Model
const Supply: Model<ISupply> = model<ISupply>('Supply', supplySchema);


export default Supply;
