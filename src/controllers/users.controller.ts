import { Request, Response } from "express";
import IUser from '../interfaces/user.interface';
import User from "../models/user.model";
class UsersController{
  public index = async (req: Request, res: Response): Promise<Response> => {
    try{
      const users: IUser[] | null = await User.find({},{ 'password':0, 'refreshToken':0, 'authenticationToken':0 }).populate('roles', 'role');
      return res.status(200).json(users);
    } catch (e){
      return res.status(500).json({mensaje:`${e}`});
    }
  };

  public update = async (req: Request, res: Response): Promise<Response> => {
    try{
      if (req.body){
        const result = await User.findOneAndUpdate({_id: req.body._id}, req.body, { new: true, projection: {'password':0, 'refreshToken':0, 'authenticationToken':0}}).populate('roles', 'role');
        return res.status(200).json(result);
      }else{
        return res.status(400).json({mensaje: "Request body vacío"})
      }
    } catch (e){
      return res.status(500).json({mensaje: `${e}`});
    }
  }
};

export default new UsersController;