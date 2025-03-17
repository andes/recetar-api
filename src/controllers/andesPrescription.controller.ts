import { Request, Response, response } from 'express';
import { BaseController } from '../interfaces/classes/base-controllers.interface';
import IPrescriptionAndes, { IDispensa } from '../interfaces/prescriptionAndes.interface';
import needle from 'needle';
import PrescriptionAndes from '../models/prescriptionAndes.model';
import Pharmacy from '../models/pharmacy.model';
import IPharmacy from '../interfaces/pharmacy.interface';
import User from '../models/user.model';
import IUser from '../interfaces/user.interface';

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
    try{
      if (!req.query.id) return res.status(400).json({mensaje: 'Missing required params!'});
      
      const id = req.query.id;
      const prescriptionAndes: IPrescriptionAndes | null = await PrescriptionAndes.findOne({idAndes: id});
      console.log('index', PrescriptionAndes);
      return res.status(200).json(prescriptionAndes);
    } catch(e) {
      return res.status(500).json({mensaje: 'Error', error: e});
    }
  }

  public update = async (req: Request, res: Response): Promise<Response> => {
    return res.status(404);
  }

  public delete = async (req: Request, res: Response): Promise<Response> => {
    return res.status(404);
  }

  public getFromAndes = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.query.dni) return res.status(400).json({mensaje: 'Missing required params!'});
      const dni = req.query.dni;
      const sexo = req.query.sexo ? req.query.sexo : '';
      
      const resp = await needle('get', `${process.env.ANDES_ENDPOINT}/modules/recetas?documento=${dni}&estado=vigente${sexo ? `&sexo=${sexo}` : ''}`, {headers: { 'Authorization': process.env.JWT_MPI_TOKEN}});
      if (typeof(resp.statusCode) === 'number' && resp.statusCode !== 200) return res.status(resp.statusCode).json({mensaje: 'Error', error: resp.body});
      let prescriptions: IPrescriptionAndes[] | null = resp.body;

      if (prescriptions) {
        prescriptions = prescriptions.map(prescription => {
          prescription.idAndes = prescription.id;
          prescription.id = null;
          return prescription;
        });
      }

      console.log(resp.statusCode, resp.body);
      return res.status(200).json(prescriptions)
    } catch(e) {
      return res.status(500).json({error: e})
    }
  }

  public dispense = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.body) return res.status(400).json({mensaje: 'Missing body payload!'});
    
      const prescriptionAndes: IPrescriptionAndes | null = await PrescriptionAndes.findOne({_id: req.body.prescription.idAndes});
      if (prescriptionAndes) return res.status(404).json({mensaje: 'Prescription already registered!'});
      
      const pharmacist: IUser | null = await User.findOne({id: req.body.pharmacistId});
      const newPrescriptionAndes: IPrescriptionAndes = new PrescriptionAndes(req.body.prescription);
      newPrescriptionAndes.save();
      
      const receta: IPrescriptionAndes = req.body;
      const dispensa = {
        descripcion: '',
        cantidad: receta.medicamento.cantidad,
        medicamento: receta.medicamento.concepto,
        presentacion: receta.medicamento.presentacion,
        unidades: receta.medicamento.unidades,
        cantidadEnvases: receta.medicamento.cantEnvases,
        organizacion: {
            id: pharmacist?.id ? pharmacist.id : '',
            nombre: pharmacist?.businessName ? pharmacist.businessName : '',
        }
      };
      const data = {
        op: 'dispensar',
        dispensa: dispensa,
        recetaId: receta.idAndes
      }
      const resp = await needle('patch', `${process.env.ANDES_ENDPOINT}/modules/recetas`, data, {headers: { 'Authorization': process.env.JWT_MPI_TOKEN}});
      
      if (typeof(resp.statusCode) === 'number' && resp.statusCode !== 200) return res.status(resp.statusCode).json({mensaje: 'Error', error: resp.body});
      // if () {

      // }
      
      const resultado: {status: boolean} = resp.body;

      return res.status(200).json(resultado);
    } catch(e) {
      return res.status(500).json({mensaje: 'Error', error: e});
    }
  }

}

export default new AndesPrescriptionController();
