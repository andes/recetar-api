import { Document, Types } from 'mongoose';

export type MatriculaEstado = 'vigente' | 'vencida' | 'suspendida' | 'sin-matricula' | 'baja';

export interface IProfesionGrado {
    profesion: string;
    codigoProfesion: string;
    numeroMatricula: string;
    vencimiento?: Date;
    estado?: MatriculaEstado;
}

// Caché del profesional de ANDES, ligado al usuario de RecetAr.
// La fuente de verdad es ANDES; este documento se refresca en el login.
export interface IProfessional extends Document {
    userId: Types.ObjectId;
    tipoDocumento: string;
    documento: string;
    nombre: string;
    apellido: string;
    sexo?: string;
    cuit?: string;
    profesionGrado: IProfesionGrado[];
    actualizadoEn: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
