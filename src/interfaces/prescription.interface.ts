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
}

export default interface IPrescription extends Document {
  patient: IPatient;
  professional: {
    userId: string,
    enrollment: string,
    cuil: string,
    businessName: string,
  };
  dispensedBy?: {
    userId: string,
    cuil: string,
    businessName: string,
  };
  dispensedAt: Date;
  supplies: PrescriptionSupply[];
  status: string;
  date: Date;
  createdAt?: Date;
  updatedAt?: Date;
  triple?: boolean;
}
