import UserDeprecated from './user-deprecated.model';
import IUserOld from './user-deprecated.interface';

import User from '../../models/user.model';


export class UserClass {
  public getUsers = async (): Promise<IUserOld[]> => {
    try{
      return await UserDeprecated.find();
    }catch(err){
      throw new Error("OCURRIÓ UN ERROR AL OBTENER LAS PRESCRIPCIONES: " + err);
    }
  }

  public updateNewFields = async (users: IUserOld[]): Promise<void> => {
    await Promise.all(users.map( async (user: IUserOld) => {
      try{
        const newUser = await User.findByIdAndUpdate(
          { _id: user._id },
          { isActive: false }
        );
        console.log(newUser?._id, "<====== Usuario actualizado correctamente");
      }catch(err){
        return err;
      }
    }))
  }
}