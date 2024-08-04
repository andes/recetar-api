import { Request, Response } from "express";
import IUser from '../interfaces/user.interface';
import User from "../models/user.model";

class UsersController{
  public index = async (req: Request, res: Response): Promise<Response> => {
    try{
      const users: IUser[] | null = await User.find();
      return res.status(200).json({users});
    } catch (e){
      return res.status(500).json({mensaje:`${e}`});
    }
  };
};

export default new UsersController;