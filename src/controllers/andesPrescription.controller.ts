import { Request, Response } from 'express';
import { BaseController } from '../interfaces/classes/base-controllers.interface';

class AndesPrescriptionController implements BaseController {

  public index = async (req: Request, res: Response): Promise<Response> => {
    return res;
  }

  public create = async (req: Request, res: Response): Promise<Response> => {
    try{
      const body = req.body;
      const params = req.params;
      console.log( body, params);
    
      return res.status(200).json( { msg: "Success", body: req.body} );
    }catch(err){
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  public show = async (req: Request, res: Response): Promise<Response> => {
    return res;
  }

  public update = async (req: Request, res: Response): Promise<Response> => {
    return res;
  }

  public delete = async (req: Request, res: Response): Promise<Response> => {
    return res;
  }

}

export default new AndesPrescriptionController();
