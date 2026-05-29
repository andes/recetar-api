import mongoose from 'mongoose';
import { IPharmacist } from './pharmacists.types';

const pharmacistSchema = new mongoose.Schema({
    enrollment: {
        type: String,
        required: '{PATH} is required',
        unique: true,
        index: true,
    },
    lastName: {
        type: String,
        required: '{PATH} is required',
    },
    firstName: {
        type: String,
        required: '{PATH} is required',
    },
    sex: {
        type: String,
        enum: ['Femenino', 'Masculino', 'Otro'],
        required: '{PATH} is required',
    },
    image: {
        type: String,
    },
}, { timestamps: true });

const Pharmacist: mongoose.Model<IPharmacist> = mongoose.model<IPharmacist>('Pharmacist', pharmacistSchema);

export default Pharmacist;
