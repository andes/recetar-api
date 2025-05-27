import { Document } from 'mongoose';

export default interface IObraSocial extends Document {
    codigoPuco?: number;
    nombre?: string;
    financiador?: string;
    prepaga?: boolean;
    idObraSocial?: number;
    numeroAfiliado?: string;
    elegidaDeAndes?: boolean;
}