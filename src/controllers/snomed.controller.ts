import { Request, Response } from 'express';
import { BaseController } from '../interfaces/classes/base-controllers.interface';
import needle from 'needle';
import { ISnomedConcept } from '../interfaces/supply.interface';


class snomedSupplyController implements BaseController {
    public index = async (req: Request, res: Response): Promise<Response> => {
        try {
            const resp = await needle('get', `${process.env.ANDES_ENDPOINT}/core/term/snomed/expression?expression=<763158003`, { headers: { 'Authorization': process.env.JWT_MPI_TOKEN } });
            const supplies: ISnomedConcept[] = resp.body;
            return res.status(200).json(supplies);
        } catch (e) {
            return res.status(500).json({ mensaje: 'Error', error: e });
        }
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