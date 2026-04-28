import { Document, Types } from 'mongoose';
import IRole from './role.interface';
import IProfesionAutorizada from './profesionAutorizada.interface';
export default interface IUser extends Document {
    username: string;
    email: string;
    businessName: string;
    enrollment?: string;
    cuil?: string;
    password: string;
    roles: IRole[];
    refreshToken?: string;
    authenticationToken?: string;
    passwordChangeTokenExpiry?: Date;
    passwordCreatedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    isActive: Boolean;
    activation?: {
        updatedAt: Date;
        updatedBy: Types.ObjectId;
        userId: Types.ObjectId;
        userName: string;
    };
    lastLogin?: Date;
    profesionGrado?: IProfesionAutorizada[];
    organizaciones: [{
        _id: string;
        nombre: string;
        direccion: string;
    }];
    isValidPassword(thisUser: IUser, password: string): Promise<boolean>;
    idAndes?: string;
    // eslint-disable-next-line semi
}
