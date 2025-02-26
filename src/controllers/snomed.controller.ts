import { Request, Response } from 'express';
import Supply from '../models/supply.model';
import ISupply from '../interfaces/supply.interface';
import { BaseController } from '../interfaces/classes/base-controllers.interface';


class snomedSupplyController implements BaseController {
    public index = async (req: Request, res: Response): Promise<Response> => {
        return res;
    }

    public create = async (req: Request, res: Response): Promise<Response> => {
        return res.status(200);
    }

    public show = async (req: Request, res: Response): Promise<Response> => {
        return res.status(200);
    }

    public update = async (req: Request, res: Response): Promise<Response> => {
        return res.status(200);
    }

    public delete = async (req: Request, res: Response): Promise<Response> => {
        return res.status(200)
    }

}
export default new snomedSupplyController();