import { Document, Types } from 'mongoose';

export interface IApplicationOrganization {
    _id?: string;
    nombre?: string;
}

export interface IApplication extends Document {
    _id: Types.ObjectId;
    nombre: string;
    organizacion?: IApplicationOrganization;
    permisos: string[];
    activo: boolean;
    token?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
