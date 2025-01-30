import { Document } from 'mongoose';

export default interface IPatient extends Document {
  dni?: string;
  lastName: string;
  firstName: string;
  sex: string;
  genero: string;
  nombreAutopercibido?: string;
  idMPI: string;
  tipoDocumentoExtranjero?: string;
  nroDocumentoExtranjero?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  findOrCreate(patientParam: IPatient): Promise<IPatient>;
}
