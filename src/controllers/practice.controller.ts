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

  public getByUserId = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const { offset = 0, limit = 10 } = req.query;
      
      const practices: IPractice[] | null = await Practice.find({ 'professional.userId': id })
        .sort({ createdAt: -1 })
        .skip(Number(offset))
        .limit(Number(limit));
        
      const total = await Practice.countDocuments({ 'professional.userId': id });
      
      return res.status(200).json({
        practices,
        total,
        offset: Number(offset),
        limit: Number(limit)
      });
    } catch (err) {
      return res.status(500).json('Server Error');
    }
  }

  public searchByTerm = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params; // professional userId
      const { searchTerm } = req.query;
      const { offset = 0, limit = 10 } = req.query;
      
      if (!searchTerm) {
        return res.status(400).json('Término de búsqueda requerido');
      }
      
      // Crear query para buscar por DNI o nombre del paciente
      const searchQuery = {
        'professional.userId': id,
        $or: [
          { 'patient.dni': { $regex: searchTerm, $options: 'i' } },
          { 'patient.firstName': { $regex: searchTerm, $options: 'i' } },
          { 'patient.lastName': { $regex: searchTerm, $options: 'i' } },
          { 'patient.nombreAutopercibido': { $regex: searchTerm, $options: 'i' } }
        ]
      };
      
      const practices: IPractice[] | null = await Practice.find(searchQuery)
        .sort({ date: -1 })
        .skip(Number(offset))
        .limit(Number(limit));
        
      const total = await Practice.countDocuments(searchQuery);
      
      return res.status(200).json({
        practices,
        total,
        offset: Number(offset),
        limit: Number(limit)
      });
    } catch (err) {
      return res.status(500).json('Server Error');
    }
  }

  public getById = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const practice: IPractice | null = await Practice.findById(id);

      return res.status(200).json(practice);
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }
}

export default new PracticeController();