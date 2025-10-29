import { Request, Response } from 'express';
import { BaseController } from '../interfaces/classes/base-controllers.interface';
import IPrescriptionAndes, { IDispensa } from '../interfaces/prescriptionAndes.interface';
import needle from 'needle';
import PrescriptionAndes from '../models/prescriptionAndes.model';
import User from '../models/user.model';
import IUser from '../interfaces/user.interface';
import prescriptionController from './prescription.controller';
import AndesService from '../services/andesService';
import moment = require('moment');


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
            const dni = req.query.dni;
            const sexo = req.query.sexo ? req.query.sexo : '';

            // Filtros opcionales desde query parameters
            const { status, dateFrom, dateTo } = req.query;

            let prescriptions: IPrescriptionAndes[] | null = [];

            // Construir URL para Andes con filtros opcionales
            let andesUrl = `${process.env.ANDES_ENDPOINT}/modules/recetas/filtros?documento=${dni}&sexo=${sexo.toLowerCase()}`;

            let estadoFiltro = 'vigente';
            const validEstados = ['pendiente', 'vigente', 'finalizada', 'vencida', 'suspendida', 'rechazada', 'dispensada', 'todas'];

            // Aplicar filtro de estado si se proporciona, sino usar 'vigente' por defecto
            if (status && validEstados.includes(status)) {
                estadoFiltro = status;
            }

            if (dateFrom) { andesUrl += `&fechaInicio=${dateFrom || ''}`; }

            if (dateTo) { andesUrl += `&fechaFin=${dateTo || ''}`; }

            andesUrl += `&estado=${estadoFiltro}`;

            const resp = await needle('get', andesUrl, { headers: { Authorization: process.env.JWT_MPI_TOKEN } });

            if (typeof (resp.statusCode) === 'number' && resp.statusCode !== 200) { return res.status(resp.statusCode).json({ mensaje: 'Error', error: resp.body }); }
            let andesPrescriptions: IPrescriptionAndes[] | null = resp.body;

            if (andesPrescriptions) {
                andesPrescriptions = andesPrescriptions.map(aPrescription => {
                    aPrescription.idAndes = aPrescription._id;
                    return aPrescription;
                });
                prescriptions = [...prescriptions, ...andesPrescriptions];
            }


            return res.status(200).json(prescriptions);
        } catch (e) {
            return res.status(500).json({ error: e });
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
            const resp = await needle('patch', `${process.env.ANDES_ENDPOINT}/modules/recetas`, body, { headers: { Authorization: process.env.JWT_MPI_TOKEN } });
            if (typeof (resp.statusCode) === 'number' && resp.statusCode !== 200) { return res.status(resp.statusCode).json({ mensaje: 'Error', error: resp.body }); }
            if (typeof (resp.statusCode) === 'number' && resp.statusCode === 200) {
                const prescriptionUpdated: IPrescriptionAndes = resp.body;
                await PrescriptionAndes.findByIdAndUpdate(receta.id.toString(), prescriptionUpdated);
            }

            const resultado: IPrescriptionAndes = resp.body;

            return res.status(200).json(resultado);
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

            const resp = await needle('patch', `${process.env.ANDES_ENDPOINT}/modules/recetas`, body, { headers: { Authorization: process.env.JWT_MPI_TOKEN } });
            if (typeof (resp.statusCode) === 'number' && resp.statusCode !== 200) { return res.status(resp.statusCode).json({ mensaje: 'Error', error: resp.body }); };
            if (typeof (resp.statusCode) === 'number' && resp.statusCode === 200) {
                await PrescriptionAndes.findByIdAndDelete(prescriptionAndesId.toString());
            }
            return res.status(200).json(resp.body);
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
            console.log('Suspendiendo prescripción...', req.body);
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
                const result = await AndesService.suspendPrescription([recetaId], motivo, observacion, profesionalAndes);

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
