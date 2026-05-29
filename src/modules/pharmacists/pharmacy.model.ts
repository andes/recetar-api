import mongoose from 'mongoose';
import { IPharmacy } from './pharmacists.types';

const pharmacySchema = new mongoose.Schema({
    cuit: {
        type: String,
        required: '{PATH} is required',
        unique: true,
        index: true,
    },
    name: {
        type: String,
        required: '{PATH} is required',
    },
    city: {
        type: String,
        required: '{PATH} is required',
    },
    pharmacist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacist',
        required: true,
    },
    address: {
        type: String,
    },
    image: {
        type: String,
    },
}, { timestamps: true });

const Pharmacy: mongoose.Model<IPharmacy> = mongoose.model<IPharmacy>('Pharmacy', pharmacySchema);

export default Pharmacy;
