import { Document, Types } from 'mongoose';

export interface IPharmacist extends Document {
    enrollment: string;
    lastName: string;
    firstName: string;
    sex: string;
    image?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IPharmacy extends Document {
    cuit: string;
    name: string;
    city: string;
    pharmacist: Types.ObjectId | IPharmacist;
    address?: string;
    image?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
