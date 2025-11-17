import { Request, Response } from 'express';
import IUser from '../interfaces/user.interface';
import User from '../models/user.model';
class UsersController {
    public index = async (req: Request, res: Response): Promise<Response> => {
        try {
            const users: IUser[] | null = await User.find({},{ password:0, refreshToken:0, authenticationToken:0 }).populate('roles', 'role');
            return res.status(200).json(users);
        } catch (e) {
            return res.status(500).json({ mensaje:`${e}` });
        }
    };

    public show = async (req: Request, res: Response): Promise<Response> => {
        try {
            const user: IUser | null = await User.findById(req.params.id, { password:0, refreshToken:0, authenticationToken:0 }).populate('roles', 'role');
            if (user) {
                return res.status(200).json(user);
            } else {
                return res.status(404).json({ mensaje: 'Usuario no encontrado' });
            }
        } catch (e) {
            return res.status(500).json({ mensaje: `${e}` });
        }
    };

    public update = async (req: Request, res: Response): Promise<Response> => {
        try {
            if (Object.keys(req.body).length !== 0 && req.body._id) {
                const result = await User.findOneAndUpdate({ _id: req.body._id }, req.body, { new: true, projection: { password:0, refreshToken:0, authenticationToken:0 } }).populate('roles', 'role');
                return res.status(200).json(result);
            } else {
                return res.status(400).json({ mensaje: 'Request body vacío' });
            }
        } catch (e) {
            return res.status(500).json({ mensaje: `${e}` });
        }
    };
};

export default new UsersController;
