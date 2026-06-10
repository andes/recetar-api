import { Document } from 'mongoose';

export interface IProfessional extends Document {
    dni?: string;
    enrollment: string;
    lastName: string;
    firstName: string;
    sex?: string;
    image?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
