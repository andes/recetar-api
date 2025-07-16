import { Request, Response } from 'express';
import { httpCodes } from '../config/config';
import IPractice from '../interfaces/practice.interface';
import Practice from '../models/practice.model';
import IUser from '../interfaces/user.interface';
import User from '../models/user.model';
import IPatient from '../interfaces/patient.interface';
import Patient from '../models/patient.model';

class PracticeController {

  public create = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { professional, patient, date, practice, indications, diagnostic } = req.body;
      const myPatient: IPatient = await Patient.schema.methods.findOrCreate(patient);
      const myProfessional: IUser | null = await User.findOne({ _id: professional });

      // Validar campos requeridos
      if (!date) {
        return res.status(httpCodes.BAD_REQUEST).json({
          message: 'Faltan campos requeridos para crear la práctica'
        });
      }

      // Validar campos del paciente
      if (!myPatient?._id) {
        return res.status(httpCodes.BAD_REQUEST).json({
          message: 'Faltan datos requeridos del paciente'
        });
      }

      // Validar campos del profesional
      if (!myProfessional?._id) {
        return res.status(httpCodes.BAD_REQUEST).json({
          message: 'Faltan datos requeridos del profesional'
        });
      }

      if (patient?.obraSocial.nombre) {
        myPatient.obraSocial = patient.obraSocial;
      }

      const newPractice = new Practice({
        date,
        patient: myPatient,
        professional: {
          userId: myProfessional?._id,
          businessName: myProfessional?.businessName,
          cuil: myProfessional?.cuil,
          enrollment: myProfessional?.enrollment,
        },
        practice,
        indications,
        diagnostic
      });

      const savedPractice = await newPractice.save();

      return res.status(httpCodes.CREATED).json([savedPractice]);
    } catch (error) {
      return res.status(httpCodes.INTERNAL_SERVER_ERROR).json('Error interno del servidor al crear la práctica');
    }
  }
}

export default new PracticeController();