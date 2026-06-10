import { Document } from 'mongoose';

export interface IPrescriptionAndesDispense {
    descripcion: string;
    cantidad: number;
    organizacion?: { id?: string; nombre?: string };
}

export interface IPrescriptionAndes extends Document {
    idAndes?: string;
    profesionalId?: string;
    organizacion?: { _id?: string; nombre?: string };
    profesional?: { id?: string; nombre?: string; apellido?: string; documento?: string };
    paciente?: {
        id?: string;
        nombre?: string;
        apellido?: string;
        documento?: string;
        sexo?: string;
        fechaNacimiento?: string;
    };
    concepto?: { conceptId?: string; term?: string };
    recetaTipo?: string;
    estadoActual?: {
        tipo: string;
        createdAt?: string;
    };
    estadoDispensaActual?: {
        tipo: string;
    };
    dispensa?: IPrescriptionAndesDispense[];
    createdAt: Date;
    updatedAt: Date;
}
