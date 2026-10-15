import { Document } from 'mongoose';

export interface IObraSocial {
    codigoPuco?: number;
    nombre?: string;
    financiador?: string;
    prepaga?: boolean;
    idObraSocial?: number;
    numeroAfiliado?: string;
}

export interface IPatientContacto {
    tipo: 'fijo' | 'celular' | 'email' | 'extranjero';
    valor: string;
    ranking?: number;
    activo?: boolean;
}

export interface IPatientDireccion {
    calle?: string;
    codigoPostal?: string;
    barrio?: string;
    localidad?: string;
    provincia?: string;
    pais?: string;
    ranking?: number;
    activo?: boolean;
    geoReferencia?: number[];
    situacionCalle?: boolean;
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
    contactos?: IPatientContacto[];
    direcciones?: IPatientDireccion[];
}
