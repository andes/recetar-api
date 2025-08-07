import { Request, Response } from 'express';
import ICertificate from '../interfaces/certificate.interface';
import Certificate from '../models/certificate.model';
import IPatient from '../interfaces/patient.interface';
import Patient from '../models/patient.model';
import IUser from '../interfaces/user.interface';
import User from '../models/user.model';

class CertificateController {

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

    public update = async (req: Request, res: Response): Promise<Response> => {
        const { id } = req.params;
        try {
            const certificate: ICertificate | null = await Certificate.findById(id);
            if (!certificate) {
                return res.status(404).json('Certificado no encontrado');
            }
            const updatedCertificate: ICertificate | null = await Certificate.findOneAndUpdate({ _id: id }, {
                anulateReason: req.body.anulateReason,
                anulateDate: req.body.anulateDate,
                status: 'anulado',
            });

            return res.status(200).json(updatedCertificate);
        } catch (error) {
            return res.status(500).json('Server Error');
        }
    }

    public getByUserId = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { userId } = req.params;
            const prescriptions: ICertificate[] | null = await Certificate.find({ 'professional.userId': userId }).sort({ field: 'desc', date: -1 });
            return res.status(200).json(prescriptions);
        } catch (err) {
            return res.status(500).json('Server Error');
        }
    }
}

export default new CertificateController();