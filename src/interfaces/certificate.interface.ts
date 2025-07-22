import { Document } from 'mongoose';
import IPatient from './patient.interface';

export default interface ICertificate extends Document {
    patient: IPatient;
    professional: {
        userId: string,
        enrollment: string,
        cuil: string,
        businessName: string,
    };
    certificate: string;
    createdAt: Date;
    updatedAt?: Date;
}