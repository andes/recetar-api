import { Document, Types } from 'mongoose';

export interface IProfesionGrado {
    profesion: string;
    codigoProfesion: string;
    numeroMatricula: string;
}

export interface IProfessional {
    userId: Types.ObjectId;
    enrollment?: string;
    cuil?: string;
    businessName?: string;
    profesionGrado?: IProfesionGrado[];
}

export interface IObraSocialPractice {
    nombre?: string;
    codigoPuco?: number;
    numeroAfiliado?: string;
}

export interface IPatientSubDoc {
    firstName: string;
    lastName: string;
    dni: string;
    sex: string;
    obraSocial?: IObraSocialPractice | null;
}

export interface IPractice extends Document {
    date: Date;
    patient: IPatientSubDoc;
    professional: IProfessional;
    practice?: string;
    diagnostic?: string;
    indications?: string;
    status: 'active' | 'completed' | 'cancelled';
    createdAt: Date;
    updatedAt: Date;
}
