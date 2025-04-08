import { Request, Response, response } from 'express';
import { BaseController } from '../interfaces/classes/base-controllers.interface';
import IPrescriptionAndes, { IDispensa } from '../interfaces/prescriptionAndes.interface';
import needle from 'needle';
import PrescriptionAndes from '../models/prescriptionAndes.model';
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
      if (!req.params.id) return res.status(400).json({mensaje: 'Missing required params!'});
      
      const id = req.params.id;
      const prescriptionAndes: IPrescriptionAndes | null = await PrescriptionAndes.findOne({idAndes: id});
      if (!prescriptionAndes) return res.status(404).json({mensaje: 'Prescription not found!'});
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
      let prescriptions: IPrescriptionAndes[] | null = [];

      const resp = await needle('get', `${process.env.ANDES_ENDPOINT}/modules/recetas?documento=${dni}&estado=vigente${sexo ? `&sexo=${sexo}` : ''}`, {headers: { 'Authorization': process.env.JWT_MPI_TOKEN}});
      if (typeof(resp.statusCode) === 'number' && resp.statusCode !== 200) return res.status(resp.statusCode).json({mensaje: 'Error', error: resp.body});
      let andesPrescriptions: IPrescriptionAndes[] | null = resp.body;

      if (andesPrescriptions) {
        andesPrescriptions = andesPrescriptions.map(aPrescription => {
          aPrescription.idAndes = aPrescription._id;
          return aPrescription;
        });
        prescriptions = [...prescriptions, ...andesPrescriptions];
      }

      const savedPrescriptions: IPrescriptionAndes[] | null = await PrescriptionAndes.find({'paciente.documento': dni});
      if (savedPrescriptions) {
        prescriptions = [...prescriptions, ...savedPrescriptions];
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
    
      const prescriptionAndes: IPrescriptionAndes | null = await PrescriptionAndes.findOne({_id: req.body.prescription.id});
      if (prescriptionAndes) {
        return res.status(404).json('Prescription already registered!');
      }
      const pharmacist: IUser | null = await User.findOne({_id: req.body.pharmacistId.toString()});
      const receta: IPrescriptionAndes = new PrescriptionAndes(req.body.prescription);
      receta.save();
      
      const dispensa = {
        id: receta.id.toString(),
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
      const body = {
        op: 'dispensar',
        dispensa: dispensa,
        recetaId: receta.id.toString()
      }
      const resp = await needle('patch', `${process.env.ANDES_ENDPOINT}/modules/recetas`, body, {headers: { 'Authorization': process.env.JWT_MPI_TOKEN}});
      if (typeof(resp.statusCode) === 'number' && resp.statusCode !== 200) return res.status(resp.statusCode).json({mensaje: 'Error', error: resp.body});
      if (typeof(resp.statusCode) === 'number' && resp.statusCode === 200) {
        const prescriptionUpdated: IPrescriptionAndes = resp.body;
        await PrescriptionAndes.findByIdAndUpdate(receta.id.toString(), prescriptionUpdated);
      }
      
      const resultado: IPrescriptionAndes = resp.body;

      return res.status(200).json(resultado);
    } catch(e) {
      console.log('error', e);
      return res.status(500).json({mensaje: 'Error', error: e});
    }
  }

  public cancelDispense = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.body) return res.status(400).json({mensaje: 'Missing body payload!'});

      const prescriptionAndes: IPrescriptionAndes | null = await PrescriptionAndes.findOne({_id: req.body.prescription.id});
      if (!prescriptionAndes) return res.status(404).json('Prescription not found!');

      const pharmacist: IUser | null = await User.findOne({_id: req.body.pharmacistId.toString()});
      if (!pharmacist) return res.status(404).json('Pharmacist not found!');
    
      const body = {
        op: 'cancelar-dispensa',
        recetaId: prescriptionAndes._id.toString(),
        dataDispensa: {
          dispensaId: prescriptionAndes._id.toString(),
          motivo: '',
          organizacion: {
            id: pharmacist.id,
            nombre: pharmacist.businessName,
          }
        }
      }
      
      const resp = await needle('patch', `${process.env.ANDES_ENDPOINT}/modules/recetas`, body, {headers: { 'Authorization': process.env.JWT_MPI_TOKEN}});
      if (typeof(resp.statusCode) === 'number' && resp.statusCode !== 200) return res.status(resp.statusCode).json({mensaje: 'Error', error: resp.body});
      if (typeof(resp.statusCode) === 'number' && resp.statusCode === 200) {
        await PrescriptionAndes.findByIdAndDelete(prescriptionAndes.id.toString());
      }
      return res.status(200).json(resp.body);
    } catch(e) {
      return res.status(500).json({mensaje: 'Error', error: e});
    }
  }

}

export default new AndesPrescriptionController();
