import { Request, Response } from 'express';
import { BaseController } from '../interfaces/classes/base-controllers.interface';
import User from '../models/user.model';
import IUser from '../interfaces/user.interface';
import AndesService from '../services/andesService';

class AndesInsumoPrescriptionController implements BaseController {

    public index = async (req: Request, res: Response): Promise<Response> => {
        return res;
    };

    public create = async (req: Request, res: Response): Promise<Response> => {
        return res.status(200).json({ msg: 'Success' });
    };

    public show = async (req: Request, res: Response): Promise<Response> => {
        return res.status(200).json({});
    };

    public update = async (req: Request, res: Response): Promise<Response> => {
        return res.status(404);
    };

    public delete = async (req: Request, res: Response): Promise<Response> => {
        return res.status(404);
    };

    public dispense = async (req: Request, res: Response): Promise<Response> => {
        try {
            if (!req.body) { return res.status(400).json({ mensaje: 'Missing body payload!' }); }

            const { prescription, pharmacistId } = req.body;
            if (!prescription || !pharmacistId) {
                return res.status(400).json({ mensaje: 'Missing required fields: prescription and pharmacistId' });
            }

            const pharmacist: IUser | null = await User.findOne({ _id: pharmacistId.toString() });
            if (!pharmacist) {
                return res.status(404).json({ mensaje: 'Pharmacist not found!' });
            }

            const dispensa = {
                id: prescription._id.toString(),
                descripcion: '',
                insumos: prescription.insumo ? [{
                    insumo: prescription.insumo.concepto || prescription.insumo,
                    cantidad: prescription.insumo.cantidad || 1,
                    cantidadEnvases: prescription.insumo.cantidad || 1,
                    unidades: prescription.insumo.unidades || null
                }] : [],
                organizacion: {
                    id: pharmacist.id ? pharmacist.id : '',
                    nombre: pharmacist.businessName ? pharmacist.businessName : '',
                }
            };

            const body = {
                op: 'dispensar',
                dispensa,
                recetaId: prescription._id.toString()
            };

            const prescriptionUpdated = await AndesService.patchInsumoPrescription(body);

            return res.status(200).json(prescriptionUpdated);
        } catch (e) {
            return res.status(500).json({ mensaje: 'Error', error: e });
        }
    };

    public cancelDispense = async (req: Request, res: Response): Promise<Response> => {
        try {
            if (!req.body) { return res.status(400).json({ mensaje: 'Missing body payload!' }); }

            const { prescriptionId, pharmacistId } = req.body;
            if (!prescriptionId || !pharmacistId) {
                return res.status(400).json({ mensaje: 'Missing required fields: prescriptionId and pharmacistId' });
            }

            const pharmacist: IUser | null = await User.findOne({ _id: pharmacistId.toString() });
            if (!pharmacist) { return res.status(404).json('Pharmacist not found!'); }

            const body = {
                op: 'cancelar-dispensa',
                recetaId: prescriptionId,
                dataDispensa: {
                    idDispensa: prescriptionId,
                    motivo: '',
                    organizacion: {
                        id: pharmacist.id,
                        nombre: pharmacist.businessName,
                    }
                }
            };

            const canceledPrescription = await AndesService.patchInsumoPrescription(body);

            return res.status(200).json(canceledPrescription);
        } catch (e) {
            return res.status(500).json({ mensaje: 'Error', error: e });
        }
    };

}

export default new AndesInsumoPrescriptionController();
