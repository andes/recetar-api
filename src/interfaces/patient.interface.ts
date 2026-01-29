import { Document } from 'mongoose';
import IObraSocial from './obraSocial.interface';

export default interface IPatient extends Document {
    dni?: string;
    lastName: string;
    firstName: string;
    fechaNac?: Date;
    sex: string;
    genero: string;
    nombreAutopercibido?: string;
    idMPI: string;
    obraSocial?: IObraSocial;
    tipoDocumentoExtranjero?: string;
    nroDocumentoExtranjero?: string;
    estado?: string; // estado del paciente en ANDES:
    status?: string;
    createdAt?: Date;
    updatedAt?: Date;
    idLocalInMPI?: boolean; // Indica si el paciente tiene ID local en Array de identificadores de MPI
    findOrCreate(patientParam: IPatient): Promise<IPatient>;
    cuil?: string | null;
}
