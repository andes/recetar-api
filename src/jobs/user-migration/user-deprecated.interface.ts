import { Document } from 'mongoose';
import IRole from '../../interfaces/role.interface';

export default interface IUserOld extends Document {
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
  isValidPassword(thisUser: IUserOld, password: string): Promise<boolean>;
}