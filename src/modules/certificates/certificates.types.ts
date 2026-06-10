import { Document } from 'mongoose';

export interface IProfesionGradoCert {
    profesion: string;
    codigoProfesion: string;
    numeroMatricula: string;
}

export interface IProfessionalCert {
    userId: string;
    businessName: string;
    cuil?: string;
    enrollment?: string;
    profesionGrado?: IProfesionGradoCert[];
}

export interface IPatientCertSubDoc {
    firstName: string;
    lastName: string;
    dni?: string;
    sex: string;
    nombreAutopercibido?: string;
    fechaNac?: Date | null;
    idMPI?: string;
    obraSocial?: {
        nombre?: string;
        numeroAfiliado?: string;
    };
}

export interface ICertificate extends Document {
    patient: IPatientCertSubDoc;
    professional: IProfessionalCert;
    certificate?: string;
    startDate: Date;
    cantDias: number;
    endDate?: Date;
    status?: string;
    anulateReason?: string;
    anulateDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}
