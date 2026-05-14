import { Document } from 'mongoose';

export default interface IPractice extends Document {
  date: Date;
  patient: {
    dni: string;
    sex: string;
    lastName: string;
    firstName: string;
    obraSocial?: {
      nombre: string;
      codigoPuco: string;
      numeroAfiliado: string;
    };
  };
  professional: {
    userId: string;
    enrollment: string;
    cuil: string;
    businessName: string;
    profesionGrado?: {
      profesion: string;
      codigoProfesion: string;
      numeroMatricula: string;
    }[];
  };
  practice: string;
  diagnostic: string;
  indications: string;
  createdAt?: Date;
  updatedAt?: Date;
  status?: 'active' | 'completed' | 'cancelled';
}