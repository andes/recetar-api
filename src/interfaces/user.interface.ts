import { Document, Types } from 'mongoose';
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
    activation?: {
        updatedAt: Date;
        updatedBy: Types.ObjectId;
    };
    lastLogin?: Date;
    profesionGrado?: IProfesionAutorizada[];
    isValidPassword(thisUser: IUser, password: string): Promise<boolean>;
    idAndes?: string;
};
