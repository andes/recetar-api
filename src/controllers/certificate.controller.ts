import { Request, Response } from 'express';
import { BaseController } from '../interfaces/classes/base-controllers.interface';
import ICertificate from '../interfaces/certificate.interface';
import Certificate from '../models/certificate.model';
import IPatient from '../interfaces/patient.interface';
import Patient from '../models/patient.model';
import IUser from '../interfaces/user.interface';
import User from '../models/user.model';

class CertificateController implements BaseController {

    public index = async (req: Request, res: Response): Promise<Response> => {
        const certificates: ICertificate[] = await Certificate.find();
        return res.status(200).json({ certificates });
    }

    public create = async (req: Request, res: Response): Promise<Response> => {
        const { professional, patient, certificate, date } = req.body;
        const myPatient: IPatient = await Patient.schema.methods.findOrCreate(patient);
        const myProfessional: IUser | null = await User.findOne({ _id: professional });
        try {
            if (patient?.obraSocial.nombre) {
                myPatient.obraSocial = patient.obraSocial;
            }
            const newCertificate = new Certificate({
                patient: myPatient,
                professional: {
                    userId: myProfessional?._id,
                    businessName: myProfessional?.businessName,
                    cuil: myProfessional?.cuil,
                    enrollment: myProfessional?.enrollment,
                },
                certificate,
                date,
            });
            await newCertificate.save();
            return res.status(200).json(newCertificate);
        } catch (error) {
            return res.status(500).json('Error al cargar el certificado');
        }
    }

    public getByUserId = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params;
            const { offset = 0, limit = 10 } = req.query;
            
            const certificates: ICertificate[] | null = await Certificate.find({ 'professional.userId': id })
                .sort({ field: 'desc', date: -1 })
                .skip(Number(offset))
                .limit(Number(limit));
                
            const total = await Certificate.countDocuments({ 'professional.userId': id });
            
            return res.status(200).json({
                certificates,
                total,
                offset: Number(offset),
                limit: Number(limit)
            });
        } catch (err) {
            return res.status(500).json('Server Error');
        }
    }
    public show = async (req: Request, res: Response): Promise<Response> => {
        // Implementation for showing a certificate by ID
        // const certificate = await Certificate.findById(req.params.id);
        // if (!certificate) {
        //     return res.status(404).json({ message: 'Certificate not found' });
        // }
        return res.status(201);
    }

    public update = async (req: Request, res: Response): Promise<Response> => {
        // const updatedCertificate = await Certificate.findByIdAndUpdate(req.params.id, req.body, { new: true });
        // if (!updatedCertificate) {
        //     return res.status(404).json({ message: 'Certificate not found' });
        // }
        return res.status(201);
    }

    public delete = async (req: Request, res: Response): Promise<Response> => {
        // const deletedCertificate = await Certificate.findByIdAndDelete(req.params.id);
        // if (!deletedCertificate) {
        //     return res.status(404).json({ message: 'Certificate not found' });
        // }
        // return res.status(200).json({ message: 'Certificate deleted successfully' });
        return res.status(201);
    }

    public getById = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params;
            const certificate: ICertificate | null = await Certificate.findById(id);

            return res.status(200).json(certificate);
        } catch (err) {
            console.log(err);
            return res.status(500).json('Server Error');
        }
    }
    
}

export default new CertificateController();