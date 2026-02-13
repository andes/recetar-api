import { Request, Response } from 'express';
import { BaseController } from '../interfaces/classes/base-controllers.interface';
import needle from 'needle';
import { ISnomedConcept } from '../interfaces/supply.interface';


class snomedSupplyController implements BaseController {
    public index = async (req: Request, res: Response): Promise<Response> => {
        try {
            const term = req.query.search;
            const path = process.env.API_SNOMED || process.env.ANDES_ENDPOINT;
            const resp = await needle('get', `${path}/core/term/snomed/medicamentos?term=${term}`);
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