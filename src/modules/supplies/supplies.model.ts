import mongoose from 'mongoose';
import { ISupply } from './supplies.types';

const snomedConceptSchema = new mongoose.Schema({
    conceptId: { type: String },
    term: { type: String },
    fsn: { type: String },
    semanticTag: { type: String },
}, { _id: false });

const supplyCodeSchema = new mongoose.Schema({
    source: { type: String, enum: ['SIFAHO', 'SNOMED'] },
    value: { type: String },
}, { _id: false });

export const supplySchema = new mongoose.Schema({
    name: {
        type: String,
        required: '{PATH} is required',
    },
    activePrinciple: {
        type: String,
    },
    pharmaceutical_form: {
        type: String,
    },
    power: {
        type: String,
    },
    unity: {
        type: String,
    },
    firstPresentation: {
        type: String,
    },
    secondPresentation: {
        type: String,
    },
    snomedConcept: {
        type: snomedConceptSchema,
    },
    code: {
        type: supplyCodeSchema,
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
}, {
    timestamps: true,
});

const Supply: mongoose.Model<ISupply> = mongoose.model<ISupply>('Supply', supplySchema);

export default Supply;
