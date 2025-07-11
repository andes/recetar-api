import { Request, Response } from 'express';
import Prescription from '../models/prescription.model';
import IPrescription, { PrescriptionSupply } from '../interfaces/prescription.interface';
import { BaseController } from '../interfaces/classes/base-controllers.interface';
import ISupply from '../interfaces/supply.interface';
import Supply from '../models/supply.model';
import IPatient from '../interfaces/patient.interface';
import Patient from '../models/patient.model';
import User from '../models/user.model';
import Role from '../models/role.model';
import IUser from '../interfaces/user.interface';
import moment = require('moment');
import IRole from '../interfaces/role.interface';
import { Types } from 'mongoose';
const csv = require('fast-csv');

class PrescriptionController implements BaseController {

  public index = async (req: Request, res: Response): Promise<Response> => {
    const prescriptions: IPrescription[] = await Prescription.find();
    return res.status(200).json({ prescriptions });
  }

  public create = async (req: Request, res: Response): Promise<Response> => {
    const { professional, patient, date, supplies, triple } = req.body;
    const myPatient: IPatient = await Patient.schema.methods.findOrCreate(patient);
    const myProfessional: IUser | null = await User.findOne({ _id: professional });
    try {
      let allPrescription: IPrescription[] = [];
      if (patient?.os.nombre) {
        myPatient.obraSocial = patient.os;
      }
      for (const sup of supplies) {
        const newPrescription = new Prescription({
          patient: myPatient,
          professional: {
            userId: myProfessional?._id,
            businessName: myProfessional?.businessName,
            cuil: myProfessional?.cuil,
            enrollment: myProfessional?.enrollment,
          },
          date,
          supplies: [sup]
        });
        await newPrescription.save();
        allPrescription.push(newPrescription);
        if (triple) {
          let newPrescription2: IPrescription = new Prescription({
            patient: myPatient,
            professional: {
              userId: myProfessional?._id,
              businessName: myProfessional?.businessName,
              cuil: myProfessional?.cuil,
              enrollment: myProfessional?.enrollment,
            },
            date: moment(date).add(30, 'days'),
            supplies: [sup]
          });
          await newPrescription2.save();
          allPrescription.push(newPrescription2);
          let newPrescription3: IPrescription = new Prescription({
            patient: myPatient,
            professional: {
              userId: myProfessional?._id,
              businessName: myProfessional?.businessName,
              cuil: myProfessional?.cuil,
              enrollment: myProfessional?.enrollment,
            },
            date: moment(date).add(60, 'days'),
            supplies: [sup]
          });
          await newPrescription3.save();
          allPrescription.push(newPrescription3);
        }
      }
      return res.status(200).json(allPrescription);

    } catch (err) {
      return res.status(500).json('Error al cargar la prescripción');
    }
  }


  public show = async (req: Request, res: Response): Promise<Response> => {
    try {
      const id: string = req.params.id;
      const prescription: IPrescription | null = await Prescription.findOne({ _id: id });
      return res.status(200).json(prescription);
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  public getPrescriptionsByDateOrPatientId = async (req: Request, res: Response): Promise<Response<IPrescription[]>> => {
    try {
      const filterPatient = req.params.patient_id;
      const filterDate: string | null = req.params.date;

      // define a default date for retrieve all the documents if the date its not provided
      const defaultStart = '1900-01-01';
      let startDate: Date = moment(defaultStart, 'YYYY-MM-DD').startOf('day').toDate();
      let endDate: Date = moment(new Date()).endOf('day').toDate();

      if (typeof (filterDate) !== 'undefined') {
        startDate = moment(filterDate, 'YYYY-MM-DD').startOf('day').toDate();
        endDate = moment(filterDate, 'YYYY-MM-DD').endOf('day').toDate();
      }

      await this.updateStatuses('', filterPatient);

      const prescriptions: IPrescription[] | null = await Prescription.find({
        "patient.dni": filterPatient,
        "date": { "$gte": startDate, "$lt": endDate }
      }).sort({ field: 'desc', date: -1 });

      console.log(prescriptions);
      return res.status(200).json(prescriptions);
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  public getPrescriptionsDispensed = async (req: Request, res: Response): Promise<Response> => {
    try {
      const filterDispensedBy: string | undefined = req.query.dispensedBy
      const prescriptions: IPrescription[] | null = await Prescription.find({
        "status": "Dispensada",
        "dispensedBy.cuil": filterDispensedBy
      }).sort({ field: 'desc', date: -1 });
      return res.status(200).json(prescriptions);
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  public getByUserId = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { userId } = req.params;
      await this.updateStatuses(userId, '');
      const prescriptions: IPrescription[] | null = await Prescription.find({ "professional.userId": userId }).sort({ field: 'desc', date: -1 });
      return res.status(200).json(prescriptions);
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  // Dispense prescription if it hasn't already been

  public dispense = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { pharmacistId } = req.body;

      const dispensedBy: IUser | null = await User.findOne({ _id: pharmacistId });
      if (!dispensedBy) return res.status(4000).json("Farmacia no encontrada");

      const opts: any = { new: true };
      const dispensedAt = moment();

      const prescription: IPrescription | null = await Prescription.findOneAndUpdate({ _id: id, status: 'Pendiente' }, {
        status: 'Dispensada',
        dispensedBy: {
          userId: dispensedBy?._id,
          businessName: dispensedBy?.businessName,
          cuil: dispensedBy?.cuil,
        },
        dispensedAt: dispensedAt
      }, opts);

      if (!prescription) return res.status(422).json('La receta ya había sido dispensada.');

      return res.status(200).json(prescription);
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  public cancelDispense = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { pharmacistId } = req.body;

      const dispensedBy: IUser | null = await User.findOne({ _id: pharmacistId });

      if (!dispensedBy) return res.status(400).json("Farmacia no encontrada");

      const userRole: IRole | null = await Role.findOne({ role: "admin", _id: { $in: dispensedBy.roles } }) // checkeamos el rol del usuario no sea admin

      const controlPrescription: IPrescription | null = await Prescription.findOne({ _id: id, status: 'Dispensada' });
      if (!controlPrescription) return res.status(404).json('La receta no se encontró.');

      const limitTime = moment(controlPrescription.dispensedAt).add(2, 'hours'); // plus 2 hours to dispensedBy
      const timeNow = moment();

      /* Si ya pasó el tiempo valido para cancelar y no tiene rol admin, entonces cancelamos la accion */
      if (timeNow.isAfter(limitTime) && userRole?.role !== 'admin') return res.status(422).json('Ya no se puede anular la dispensa de la receta.');

      const opts: any = { new: true };
      const prescription: IPrescription | null = await Prescription.findOneAndUpdate({ _id: id, status: 'Dispensada' }, {
        status: 'Pendiente',
        dispensedBy: {},
        dispensedAt: ''
      }, opts);

      return res.status(200).json(prescription);
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  public update = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { date, supplies, observation, diagnostic } = req.body;

    try {

      const prescription: IPrescription | null = await Prescription.findOne({ _id: id, status: "Pendiente" });

      if (!prescription) return res.status(400).json("No se encontró la prescripción, se encuentra dispensada o vencida");


      const errors: any[] = [];
      const suppliesLoaded: PrescriptionSupply[] = [];

      await Promise.all(supplies.map(async (sup: any) => {
        if (sup.supply !== null && sup.supply !== '') {
          const sp: ISupply | null = await Supply.findOne({ _id: sup.supply._id });
          if (sp) {
            suppliesLoaded.push({ supply: sp, quantity: sup.quantity });
          } else {
            errors.push({ supply: sup.supply, message: 'Este medicamento no fue encontrado, por favor seleccionar un medicamento válido.' });
          }
        }
      }));

      if (errors.length) {
        return res.status(422).json(errors);
      }

      if (!suppliesLoaded.length) {
        return res.status(422).json({ message: 'Debe seleccionar al menos 1 medicamento' });
      }

      const opts: any = { runValidators: true, new: true, context: 'query' };
      const updatedPrescription: IPrescription | null = await Prescription.findOneAndUpdate({ _id: id }, {
        date,
        observation,
        diagnostic,
        supplies: suppliesLoaded
      }, opts);
      return res.status(200).json(updatedPrescription);
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  public delete = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const prescription = await Prescription.findOne({ _id: id });
      if (prescription?.status === "Pendiente") {
        await Prescription.findByIdAndDelete(id);
        return res.status(200).json(prescription);
      } else {
        return res.status(422).json('La receta ya se ha dispensado y no puede ser eliminada.')
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  public getCsv = async (req: Request, res: Response) => {
    const fechaDesde = moment(req.body.fechaDesde, 'YYYY-MM-DD').startOf('day').toDate();
    const fechaHasta = moment(req.body.fechaHasta, 'YYYY-MM-DD').endOf('day').toDate();
    const pipeline = [
      {
        "$match": {
          "dispensedAt": { $gte: fechaDesde, $lte: fechaHasta },
          "status": 'Dispensada',
          'dispensedBy.userId': new Types.ObjectId(req.body.pharmacistId)
        }
      },
      {
        "$unwind": '$supplies'
      },
      {
        "$project": {
          "_id": 0,
          "IdReceta": { "$toString": '$_id' },
          "Medico": "$professional.businessName",
          "Matricula": "$professional.enrollment",
          "Farmacia": "$dispensedBy.businessName",
          "Farmacia_cuit": "$dispensedBy.cuil",
          "Droga": "$supplies.supply.name",
          "Cantidad": "$supplies.quantity",
          "Fecha_receta": {
            "$dateToString": {
              "date": '$date',
              "format": "%d/%m/%Y",
              "timezone": "America/Argentina/Buenos_Aires"
            }
          },
          "Fecha_dispensa": {
            "$dateToString": {
              "date": '$dispensedAt',
              "format": "%d/%m/%Y",
              "timezone": "America/Argentina/Buenos_Aires"
            }
          }

        }
      }];
    const listado = await Prescription.aggregate(pipeline);
    res.set('Content-Type', 'text/csv');
    res.setHeader('Content-disposition', 'attachment');
    csv.write(listado, {
      headers: true, transform: (row: any) => {
        return {
          Id: row.IdReceta,
          Medico: row.Medico,
          Matricula: row.Matricula,
          Farmacia: row.Farmacia,
          'Farmacia_cuit': row.Farmacia_cuit,
          Drogas: row.Droga,
          Cantidad: row.Cantidad,
          'Fecha_receta': row.Fecha_receta,
          'Fecha_dispensa': row.Fecha_dispensa
        };
      }
    }).pipe(res);
  };

  private updateStatuses = async (professionalId: string = '', filterPatient: string = ''): Promise<void> => {
    let limitDate: Date = moment().subtract(30, 'day').startOf('day').toDate(); // expired control date
    // before search: update expired prescriptions, with status "Pendiente"
    await Prescription.updateMany({
      "status": "Pendiente",
      "date": { "$lt": limitDate },
      "$or": [{
        "professional.userId": (professionalId !== '' ? professionalId : null)
      }, {
        "patient.dni": filterPatient
      }]
    }, {
      "status": "Vencida"
    });
  }

  private getSupplies = (supplies: any[]) => {
    let drogs = '';
    supplies.forEach(sup => {
      drogs += `${sup.supply.name} - `;
    })
    return drogs;
  }
}

export default new PrescriptionController();
