import { Document } from 'mongoose';
import ISupply from './supply.interface';
import IPatient from './patient.interface';

export interface PrescriptionSupply {
    supply: ISupply;
    quantity: number;
    quantityPresentation?: number;
    diagnostic?: string;
    indication?: string;
    duplicate?: boolean;
    triplicate?: boolean;
    triplicateData?: {
        serie: string;
        numero: number;
    };
}

/* eslint no-extra-semi: "error"*/
export default interface IPrescription extends Document {
    prescriptionId?: string;
    patient: IPatient;
    professional: {
        userId: string;
        enrollment: string;
        cuil: string;
        businessName: string;
        efector?: {
            _id: string;
            nombre: string;
            direccion: string;
        };
    };
    dispensedBy?: {
        userId: string;
        cuil: string;
        businessName: string;
    };
    dispensedAt: Date;
    supplies: PrescriptionSupply[];
    status: string;
    date: Date;
    createdAt?: Date;
    updatedAt?: Date;
    trimestral?: boolean;
    ambito?: string;
}
