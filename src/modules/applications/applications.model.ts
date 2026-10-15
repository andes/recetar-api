import mongoose, { Model } from 'mongoose';
import { IApplication } from './applications.types';

const applicationSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: '{PATH} is required',
    },
    organizacion: {
        _id: String,
        nombre: String,
    },
    permisos: {
        type: [String],
        default: [],
    },
    activo: {
        type: Boolean,
        default: true,
        required: '{PATH} is required',
    },
    token: {
        type: String,
        default: '',
    },
}, { timestamps: true });

const Application: Model<IApplication> = mongoose.models.Application
    || mongoose.model<IApplication>('Application', applicationSchema);

export default Application;
