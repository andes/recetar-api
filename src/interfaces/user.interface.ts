import { Document } from 'mongoose';
import IRole from './role.interface';
import IProfesionAutorizada from './profesionAutorizada.interface';
export default interface IUser extends Document{
    username: string;
    email: string;
    businessName: string;
    enrollment?: string;
    cuil?: string;
    password: string;
    roles: IRole[];
    refreshToken?: string;
    authenticationToken?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isActive: Boolean;
    lastLogin?: Date;
    profesionGrado?: IProfesionAutorizada[];
    efectores: [{
        _id: string;
        nombre: string;
        direccion: string;
    }];
    isValidPassword(thisUser: IUser, password: string): Promise<boolean>;
    idAndes?: string;
}
