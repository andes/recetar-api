import { Request, Response } from 'express';
import { BaseController } from '../interfaces/classes/base-controllers.interface';
import needle from 'needle';
import { ISnomedConcept } from '../interfaces/supply.interface';


class snomedSupplyController implements BaseController {
  public index = async (req: Request, res: Response): Promise<Response> => {
    try {
      const search = req.query.search;
      const resp = await needle('get', `${process.env.ANDES_ENDPOINT}/core/term/snomed?expression=<763158003:732943007=*,[0..0] 774159003=*, 763032000=*&search=${search}`);
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