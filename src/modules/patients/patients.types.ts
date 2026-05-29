import { Document } from 'mongoose';

export interface IObraSocial {
    codigoPuco?: number;
    nombre?: string;
    financiador?: string;
    prepaga?: boolean;
    idObraSocial?: number;
    numeroAfiliado?: string;
}

export interface IPatient extends Document {
    dni?: string;
    lastName: string;
    firstName: string;
    fechaNac?: Date | null;
    sex: string;
    genero?: string;
    nombreAutopercibido?: string;
    idMPI?: string;
    obraSocial?: IObraSocial | null;
    tipoDocumentoExtranjero?: string;
    nroDocumentoExtranjero?: string;
    estado?: string;
    status?: string;
    createdAt?: Date;
    updatedAt?: Date;
    idLocalInMPI?: boolean;
    cuil?: string | null;
}
