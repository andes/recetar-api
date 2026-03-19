import { Request, Response } from 'express';
import { BaseController } from '../interfaces/classes/base-controllers.interface';
import IPrescriptionAndes, { IDispensa } from '../interfaces/prescriptionAndes.interface';
import PrescriptionAndes from '../models/prescriptionAndes.model';
import User from '../models/user.model';
import IUser from '../interfaces/user.interface';
import prescriptionController from './prescription.controller';
import AndesService from '../services/andesService';


class AndesPrescriptionController implements BaseController {

    public index = async (req: Request, res: Response): Promise<Response> => {
        return res;
    };

    public create = async (req: Request, res: Response): Promise<Response> => {
        try {
            const body = req.body;

            return res.status(200).json({ msg: 'Success', body });
        } catch (err) {
            return res.status(500).json({ mensaje: 'Server error', error: err });
        }
    };

    public show = async (req: Request, res: Response): Promise<Response> => {
        try {
            if (!req.params.id) { return res.status(400).json({ mensaje: 'Missing required params!' }); }

            const id = req.params.id;
            const op = req.query.op ? req.query.op : '';
            const prescriptionAndes: IPrescriptionAndes | null = await PrescriptionAndes.findOne({ id });
            if (!prescriptionAndes) {
                return res.status(200).json({
                    mensaje: 'Prescription not found!',
                    recetaId: id,
                    dispensas: [],
                    estado: 'sin-dispensa'
                });
            }

            if (op === 'andes') {
                const resp = {
                    recetaId: prescriptionAndes._id.toString(),
                    dispensas: prescriptionAndes.dispensa.map((dispensa: IDispensa) => ({
                        recetaId: prescriptionAndes._id.toString(),
                        dispensa: {
                            id: dispensa._id.toString(),
                            fecha: prescriptionAndes.estadoDispensaActual.tipo === 'dispensada' ? prescriptionAndes.estadoDispensaActual.fecha : '',
                            medicamentos: [{
                                cantidad: prescriptionAndes.medicamento.cantidad,
                                presentacion: prescriptionAndes.medicamento.presentacion,
                                unidades: prescriptionAndes.medicamento.unidades,
                                medicamento: prescriptionAndes.medicamento.concepto,
                                descripcion: '',
                                cantidadEnvases: prescriptionAndes.medicamento.cantEnvases
                            }],
                            organizacion: {
                                id: prescriptionAndes.organizacion.id.toString(),
                                nombre: prescriptionAndes.organizacion.nombre
                            }
                        }
                    })),
                    estado: prescriptionAndes.estadoDispensaActual.tipo
                };
                return res.status(200).json(resp);
            } else {

                return res.status(200).json(prescriptionAndes);
            }
        } catch (e) {
            return res.status(500).json({ mensaje: 'Error', error: e });
        }
    };

    public update = async (req: Request, res: Response): Promise<Response> => {
        return res.status(404);
    };

    public delete = async (req: Request, res: Response): Promise<Response> => {
        return res.status(404);
    };

    public getFromAndes = async (req: Request, res: Response): Promise<Response> => {
        try {
            if (!req.query.dni) { return res.status(400).json({ mensaje: 'Missing required params!' }); }
            const dni = req.query.dni as string;
            const sexo = req.query.sexo ? (req.query.sexo as any) : undefined;
            let prescriptions: IPrescriptionAndes[] | null = [];
            let andesPrescriptions: IPrescriptionAndes[] | null = null;

            andesPrescriptions = await AndesService.getPrescriptionsByPatient({ documento: dni, estado: 'vigente', sexo });

            if (andesPrescriptions) {
                andesPrescriptions = andesPrescriptions.map(aPrescription => {
                    aPrescription.idAndes = aPrescription._id;
                    return aPrescription;
                });
                prescriptions = [...prescriptions, ...andesPrescriptions];
            }

            const savedPrescriptions: IPrescriptionAndes[] | null = await PrescriptionAndes.find({ 'paciente.documento': dni });
            if (savedPrescriptions) {
                prescriptions = [...prescriptions, ...savedPrescriptions];
            }
            return res.status(200).json(prescriptions);
        } catch (e) {
            return res.status(500).json({ error: e });
        }
    };

    public searchProfessionals = async (req: Request, res: Response): Promise<Response> => {
        const { documento } = req.query;

        if (!documento) {
            return res.status(400).json({
                ok: false,
                message: 'El parámetro "documento" es requerido'
            });
        }

        try {
            const professionals = await AndesService.searchProfessionalsGuide(documento as string);

            if (professionals && professionals.length > 0) {
                return res.status(200).json({
                    ok: true,
                    message: 'Profesionales encontrados',
                    data: professionals,
                    total: professionals.length
                });
            } else {
                return res.status(200).json({
                    ok: false,
                    message: 'No se encontraron profesionales con el documento proporcionado',
                    data: [],
                    total: 0
                });
            }
        } catch (error) {
            return res.status(500).json({
                ok: false,
                message: 'Error al buscar profesionales en Andes',
                error
            });
        }
    };

    public searchPharmacies = async (req: Request, res: Response): Promise<Response> => {
        const { cuit } = req.query;

        if (!cuit) {
            return res.status(400).json({
                ok: false,
                message: 'El parámetro "cuit" es requerido'
            });
        }

        try {
            const pharmacies = await AndesService.searchPharmaciesCore(cuit as string);

            if (pharmacies && pharmacies.length > 0) {
                return res.status(200).json({
                    ok: true,
                    message: 'Farmacias encontradas',
                    data: pharmacies,
                    total: pharmacies.length
                });
            } else {
                return res.status(200).json({
                    ok: false,
                    message: 'No se encontraron farmacias con el CUIT proporcionado',
                    data: [],
                    total: 0
                });
            }
        } catch (error) {
            return res.status(500).json({
                ok: false,
                message: 'Error al buscar farmacias en Andes',
                error
            });
        }
    };

    public dispense = async (req: Request, res: Response): Promise<Response> => {
        try {
            if (!req.body) { return res.status(400).json({ mensaje: 'Missing body payload!' }); }

            const prescriptionAndes: IPrescriptionAndes | null = await PrescriptionAndes.findOne({ _id: req.body.prescription.id });
            if (prescriptionAndes) {
                return res.status(404).json('Prescription already registered!');
            }
            const pharmacist: IUser | null = await User.findOne({ _id: req.body.pharmacistId.toString() });
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
                dispensa,
                recetaId: receta.id.toString()
            };
            const prescriptionUpdated: IPrescriptionAndes = await AndesService.patchPrescription(body);

            await PrescriptionAndes.findByIdAndUpdate(receta.id.toString(), prescriptionUpdated);

            return res.status(200).json(prescriptionUpdated);
        } catch (e) {
            return res.status(500).json({ mensaje: 'Error', error: e });
        }
    };

    public cancelDispense = async (req: Request, res: Response): Promise<Response> => {
        try {
            if (!req.body) { return res.status(400).json({ mensaje: 'Missing body payload!' }); };

            const prescriptionAndesId = req.body.prescriptionId?.toString();
            const prescriptionAndes: IPrescriptionAndes | null = await PrescriptionAndes.findOne({ _id: prescriptionAndesId });
            if (!prescriptionAndes) { return res.status(404).json('Prescription not found!'); };

            const pharmacist: IUser | null = await User.findOne({ _id: req.body.pharmacistId.toString() });
            if (!pharmacist) { return res.status(404).json('Pharmacist not found!'); };

            const body = {
                op: 'cancelar-dispensa',
                recetaId: prescriptionAndesId,
                dataDispensa: {
                    idDispensa: prescriptionAndesId,
                    motivo: '',
                    organizacion: {
                        id: pharmacist.id,
                        nombre: pharmacist.businessName,
                    }
                }
            };

            const canceledPrescription: any = await AndesService.patchPrescription(body);

            await PrescriptionAndes.findByIdAndDelete(prescriptionAndesId.toString());
            return res.status(200).json(canceledPrescription);
        } catch (e) {
            return res.status(500).json({ mensaje: 'Error', error: e });
        }
    };

    public createPublic = async (req: Request, res: Response): Promise<Response> => {
        try {
            if (!req.body) {
                return res.status(400).json({ mensaje: 'Missing body payload!' });
            }
            const receta: IPrescriptionAndes = new PrescriptionAndes(req.body.prescription);
            receta.save();
            return res.status(200).json(receta);
        } catch (e) {
            return res.status(500).json({ mensaje: 'Error', error: e });
        }
    };

    public suspend = async (req: Request, res: Response): Promise<Response> => {
        try {
            if (!req.body) {
                return res.status(400).json({ mensaje: 'Missing body payload!' });
            }

            const { recetaId, profesionalId } = req.body;
            if (!recetaId || !profesionalId) {
                return res.status(400).json({ mensaje: 'Missing required params: recetaId and profesionalId!' });
            }


            const prescription: IPrescriptionAndes | null = await PrescriptionAndes.findOne({ _id: recetaId });
            if (prescription) {
                // eliminar de la base local
                await PrescriptionAndes.findByIdAndDelete(recetaId);
                return res.status(200).json({ mensaje: 'Prescription suspended locally' });
            } else {
                const profesional: IUser | null = await User.findOne({ _id: profesionalId });
                const profesionalAndes = {
                    id: profesional?.idAndes ? profesional.idAndes : '',
                    nombre: profesional?.businessName ? profesional.businessName.split(',')[1].trim() : '',
                    apellido: profesional?.businessName ? profesional.businessName.split(',')[0].trim() : '',
                    cuil: profesional?.cuil ? profesional.cuil : '',
                    matricula: profesional?.enrollment ? profesional.enrollment : '',
                    documento: profesional?.username ? profesional.username : '',
                };

                const motivo = 'suspension desde RecetAr';
                const observacion = 'suspension desde RecetAr';
                // Suspender en ANDES
                const result = await AndesService.suspendPrescription(recetaId, motivo, observacion, profesionalAndes);

                return res.status(200).json({
                    result
                });
            }


        } catch (e) {
            return res.status(500).json({ mensaje: 'Error', error: e });
        }
    };

}

export default new AndesPrescriptionController();
