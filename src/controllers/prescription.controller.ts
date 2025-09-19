import { Request, Response } from 'express';
import Prescription, { generarIdDesdeFecha } from '../models/prescription.model';
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
import needle from 'needle';
import axios from 'axios';
import AndesService from '../services/andesService';


class PrescriptionController implements BaseController {

    /**
     * Helper method para combinar prescripciones locales con prescripciones de ANDES
     * cuando el profesional tiene ámbito público
     */
    private async combineLocalAndAndesPrescriptions(
        professionalId: string,
        localPrescriptions: IPrescription[],
        localTotal: number,
        ambito: string,
        andesFilter?: (prescriptions: any[]) => any[]
    ): Promise<{ combinedPrescriptions: any[]; totalPrescriptions: number }> {
        let combinedPrescriptions: any[] = localPrescriptions || [];
        let totalPrescriptions = localTotal;

        // Si el profesional tiene ámbito público, también obtener prescripciones de ANDES
        if (ambito === 'publico') {
            const andesPrescriptions = await this.getAndTransformAndesPrescriptions(
                professionalId,
                andesFilter
            );

            if (andesPrescriptions.length > 0) {
                // Combinar y ordenar todas las prescripciones por fecha
                combinedPrescriptions = [...localPrescriptions, ...andesPrescriptions];
                combinedPrescriptions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                totalPrescriptions = combinedPrescriptions.length;
            }
        }

        return { combinedPrescriptions, totalPrescriptions };
    }

    /**
     * Helper method para obtener y transformar prescripciones de ANDES
     */
    private async getAndTransformAndesPrescriptions(
        professionalId: string,
        filter?: (prescriptions: any[]) => any[]
    ): Promise<any[]> {
        try {
            // Obtener el profesional para verificar si tiene idAndes
            const professional: IUser | null = await User.findOne({ _id: professionalId });

            if (!professional?.idAndes) {
                return [];
            }

            // Obtener prescripciones de ANDES
            const andesPrescriptions = await AndesService.getPrescriptionsByProfessional({
                professionalId: professional.idAndes
            });

            // Aplicar filtro si se proporciona (para búsquedas por término)
            const filteredPrescriptions = filter ? filter(andesPrescriptions) : andesPrescriptions;

            // Transformar las prescripciones de ANDES al formato local
            return filteredPrescriptions.map(andesPrescription => ({
                ...andesPrescription,
                _id: andesPrescription.id || andesPrescription._id,
                isFromAndes: true, // Marcador para identificar origen
                date: new Date(andesPrescription.fechaRegistro),
                professional: {
                    userId: professional._id,
                    businessName: professional.businessName,
                    cuil: professional.cuil,
                    enrollment: professional.enrollment,
                }
            }));
        } catch (andesError) {
            // eslint-disable-next-line no-console
            console.error('Error al obtener prescripciones de ANDES:', andesError);
            // En caso de error con ANDES, retornar array vacío
            return [];
        }
    }

    /**
     * Helper method para aplicar paginación y generar respuesta estándar
     */
    private generatePaginatedResponse(
        combinedPrescriptions: any[],
        totalPrescriptions: number,
        localTotal: number,
        offset: number,
        limit: number,
        ambito: string
    ) {
        // Aplicar paginación sobre el conjunto combinado
        const startIndex = Number(offset);
        const endIndex = startIndex + Number(limit);
        const paginatedPrescriptions = combinedPrescriptions.slice(startIndex, endIndex);

        return {
            prescriptions: paginatedPrescriptions,
            total: totalPrescriptions,
            offset: Number(offset),
            limit: Number(limit),
            sources: {
                local: localTotal,
                andes: ambito === 'publico' ? totalPrescriptions - localTotal : 0
            }
        };
    }

    /**
     * Helper method para filtrar prescripciones de ANDES por término de búsqueda
     */
    private filterAndesPrescriptionsByTerm(andesPrescriptions: any[], searchTerm: string): any[] {
        const searchTermLower = searchTerm.toLowerCase();
        return andesPrescriptions.filter(andesPrescription => {
            const patient = andesPrescription.paciente;
            return (
                patient.documento?.toLowerCase().includes(searchTermLower) ||
                patient.nombre?.toLowerCase().includes(searchTermLower) ||
                patient.apellido?.toLowerCase().includes(searchTermLower) ||
                patient.nombreCompleto?.toLowerCase().includes(searchTermLower)
            );
        });
    }

    public index = async (req: Request, res: Response): Promise<Response> => {
        const prescriptions: IPrescription[] = await Prescription.find();
        return res.status(200).json({ prescriptions });
    };

    public create = async (req: Request, res: Response): Promise<Response> => {
        const { professional, patient, date, supplies, trimestral, ambito } = req.body;
        let professionalAndes = null;
        const myProfessional: IUser | null = await User.findOne({ _id: professional });
        let myPatient: IPatient | null;
        if (ambito === 'publico') {
            const resp = await needle('get', `${process.env.ANDES_ENDPOINT}/core/tm/profesionales/guia?documento=${myProfessional?.username}`);
            if (!(resp.body && resp.body.length > 0 && resp.body[0].profesiones && resp.body[0].profesiones.length > 0)) {
                // eslint-disable-next-line no-console
                console.log('No se encuentra el profesional.');
                // Se le pasa ambito privado para que solo cree el paciente en local
                myPatient = await Patient.schema.methods.findOrCreate(patient, 'privado');
            }
            professionalAndes = resp.body[0];
            myPatient = await Patient.schema.methods.findOrCreate(patient, ambito);
        } else {
            myPatient = await Patient.schema.methods.findOrCreate(patient, ambito);
        }
        if (myProfessional && patient && myPatient) {
            try {
                const allPrescription: IPrescription[] = [];
                if (patient.os.nombre) {
                    patient.os.otraOS = patient.otraOS || false;
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
                        supplies: [sup],
                        ambito,
                        trimestral
                    });
                    let createAndes = false;
                    if (ambito === 'publico') {
                        if (!myProfessional?.idAndes) {
                            const resp = await needle('get', `${process.env.ANDES_ENDPOINT}/core/tm/profesionales/guia?documento=${myProfessional?.username}`);
                            if (!(resp.body && resp.body.length > 0 && resp.body[0].profesiones && resp.body[0].profesiones.length > 0)) {
                                // eslint-disable-next-line no-console
                                console.log('No se encuentra el profesional.');
                            }
                            myProfessional.idAndes = resp.body[0]?.id;
                            myProfessional.businessName = `${resp.body[0]?.apellido}, ${resp.body[0]?.nombre}`;
                            await myProfessional.save();
                        }

                        createAndes = await this.createPrescriptionAndes(newPrescription, myProfessional, myPatient);
                        if (!createAndes) {
                            await newPrescription.save();
                            allPrescription.push(newPrescription);
                        }
                    } else {
                        await newPrescription.save();
                        allPrescription.push(newPrescription);
                    }
                    if (trimestral && !createAndes) {
                        // solo guardar si no se crean en andes
                        const newPrescription2: IPrescription = new Prescription({
                            patient: myPatient,
                            professional: {
                                userId: myProfessional?._id,
                                businessName: myProfessional?.businessName,
                                cuil: myProfessional?.cuil,
                                enrollment: myProfessional?.enrollment,
                            },
                            date: moment(date).add(30, 'days').toDate(),
                            supplies: [sup],
                            ambito,
                            trimestral,
                        });
                        await newPrescription2.save();
                        allPrescription.push(newPrescription2);
                        const newPrescription3: IPrescription = new Prescription({
                            patient: myPatient,
                            professional: {
                                userId: myProfessional?._id,
                                businessName: myProfessional?.businessName,
                                cuil: myProfessional?.cuil,
                                enrollment: myProfessional?.enrollment,
                            },
                            date: moment(date).add(60, 'days').toDate(),
                            supplies: [sup],
                            ambito,
                            trimestral,
                        });
                        await newPrescription3.save();
                        allPrescription.push(newPrescription3);
                    }
                }
                // Post of prescriptions to andes publico
                return res.status(200).json(allPrescription);

            } catch (err) {
                return res.status(500).json('Error al cargar la prescripción');
            }
        } else {
            return res.status(404).json('Profesional no encontrado');
        }
    };


    public show = async (req: Request, res: Response): Promise<Response> => {
        try {
            const id: string = req.params.id;
            const prescription: IPrescription | null = await Prescription.findOne({ _id: id });
            return res.status(200).json(prescription);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
            return res.status(500).json('Server Error');
        }
    };
    private createPrescriptionAndes = async (newPrescription: IPrescription, profesional: IUser, patient: IPatient) => {
        const prescriptionAndes = {
            idPrestacion: newPrescription._id.toString(),
            idRegistro: newPrescription._id.toString(),
            fechaRegistro: newPrescription.date.toString(),
            paciente: {
                id: patient.idMPI,
                nombre: patient.firstName,
                apellido: patient.lastName,
                documento: patient.dni ? patient.dni : '',
                sexo: patient.sex.toLowerCase(),
                obraSocial: patient.obraSocial || null,
            },
            profesional: {
                id: profesional?.idAndes ? profesional.idAndes : '',
                nombre: profesional?.businessName ? profesional.businessName.split(',')[1].trim() : '',
                apellido: profesional?.businessName ? profesional.businessName.split(',')[0].trim() : '',
                cuil: profesional?.cuil ? profesional.cuil : '',
                matricula: profesional?.enrollment ? profesional.enrollment : '',
                documento: profesional?.username ? profesional.username : '',
            },
            organizacion: {
                nombre: 'Recetar',
            },
            medicamento: {
                diagnostico: newPrescription.supplies[0].diagnostic,
                concepto: newPrescription.supplies[0].supply.snomedConcept,
                presentacion: '',
                unidades: '',
                cantidad: newPrescription.supplies[0].quantityPresentation ? newPrescription.supplies[0].quantityPresentation : 1,
                cantEnvases: newPrescription.supplies[0].quantity || 1,
                dosisDiaria: {
                    dosis: null,
                    dias: null,
                    notaMedica: newPrescription.supplies[0].indication ? newPrescription.supplies[0].indication : ''
                },
                tratamientoProlongado: newPrescription.trimestral ? true : false,
                tiempoTratamiento: !newPrescription.trimestral ? null : { id: '3', nombre: '3 meses' },
                tipoReceta: newPrescription.supplies[0].triplicate ? 'triplicado' : (newPrescription.supplies[0].duplicate ? 'duplicado' : 'simple'),
                serie: newPrescription.supplies[0].triplicateData?.serie ? newPrescription.supplies[0].triplicateData?.serie.toString() : '',
                numero: newPrescription.supplies[0].triplicateData?.numero ? newPrescription.supplies[0].triplicateData?.numero.toString() : ''
            },
            origenExterno: {
                id: newPrescription._id.toString(),
                nombre: 'RecetAr',
                fecha: newPrescription.date.toString()
            }
        };
        let sendToAndes = false;
        try {
            const payload = JSON.parse(JSON.stringify(prescriptionAndes));
            const Authorization = process.env.JWT_MPI_TOKEN || '';
            const respAndes = await axios.post(`${process.env.ANDES_ENDPOINT}/modules/recetas`,
                payload,
                { headers: { Authorization } });
            if (respAndes.statusText === 'OK') {
                sendToAndes = true;
            }

        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Error al enviar receta a ANDES:', e);
        }
        return sendToAndes;
    };

    public getPrescriptionsByDateOrPatientId = async (req: Request, res: Response): Promise<Response> => {
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
                'patient.dni': filterPatient,
                date: { $gte: startDate, $lt: endDate }
            }).sort({ field: 'desc', date: -1 });

            if (prescriptions) {
                await this.ensurePrescriptionIds(prescriptions);
            }

            return res.status(200).json(prescriptions);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
            return res.status(500).json('Server Error');
        }
    };


    public getByUserId = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params;
            const { offset = 0, limit = 10, ambito = 'privado' } = req.query;

            await this.updateStatuses(id, '');

            // Obtener prescripciones locales
            const localPrescriptions: IPrescription[] | null = await Prescription.find({ 'professional.userId': id })
                .sort({ date: -1 });

            if (localPrescriptions) {
                await this.ensurePrescriptionIds(localPrescriptions);
            }

            const localTotal = await Prescription.countDocuments({ 'professional.userId': id });

            // Combinar con prescripciones de ANDES si es necesario
            const { combinedPrescriptions, totalPrescriptions } = await this.combineLocalAndAndesPrescriptions(
                id,
                localPrescriptions || [],
                localTotal,
                ambito as string
            );

            // Generar respuesta paginada
            const response = this.generatePaginatedResponse(
                combinedPrescriptions,
                totalPrescriptions,
                localTotal,
                Number(offset),
                Number(limit),
                ambito as string
            );

            return res.status(200).json(response);
        } catch (err) {
            console.log(err);
            return res.status(500).json('Server Error');
        }
    };

    public searchByTerm = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params; // professional userId
            const { searchTerm, ambito = 'privado' } = req.query;
            const { offset = 0, limit = 10 } = req.query;

            if (!searchTerm) {
                return res.status(400).json('Término de búsqueda requerido');
            }

            await this.updateStatuses(id, '');

            // Crear query para buscar por DNI o nombre del paciente en prescripciones locales
            const searchQuery = {
                'professional.userId': id,
                $or: [
                    { 'patient.dni': { $regex: searchTerm, $options: 'i' } },
                    { 'patient.firstName': { $regex: searchTerm, $options: 'i' } },
                    { 'patient.lastName': { $regex: searchTerm, $options: 'i' } },
                    { 'patient.nombreAutopercibido': { $regex: searchTerm, $options: 'i' } }
                ]
            };

            const localPrescriptions: IPrescription[] | null = await Prescription.find(searchQuery)
                .sort({ date: -1 });

            if (localPrescriptions) {
                await this.ensurePrescriptionIds(localPrescriptions);
            }

            const localTotal = await Prescription.countDocuments(searchQuery);

            // Crear filtro para prescripciones de ANDES
            const andesFilter = (prescriptions: any[]) =>
                this.filterAndesPrescriptionsByTerm(prescriptions, searchTerm as string);

            // Combinar con prescripciones de ANDES si es necesario (aplicando filtro de búsqueda)
            const { combinedPrescriptions, totalPrescriptions } = await this.combineLocalAndAndesPrescriptions(
                id,
                localPrescriptions || [],
                localTotal,
                ambito as string,
                andesFilter
            );

            // Generar respuesta paginada
            const response = this.generatePaginatedResponse(
                combinedPrescriptions,
                totalPrescriptions,
                localTotal,
                Number(offset),
                Number(limit),
                ambito as string
            );

            return res.status(200).json(response);
        } catch (err) {
            console.log(err);
            return res.status(500).json('Server Error');
        }
    };

    public getPrescriptionsDispensed = async (req: Request, res: Response): Promise<Response> => {
        try {
            const filterDispensedBy: string | undefined = req.query.dispensedBy;
            const prescriptions: IPrescription[] | null = await Prescription.find({
                status: 'Dispensada',
                'dispensedBy.cuil': filterDispensedBy
            }).sort({ field: 'desc', date: -1 });

            if (prescriptions) {
                await this.ensurePrescriptionIds(prescriptions);
            }

            return res.status(200).json(prescriptions);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
            return res.status(500).json('Server Error');
        }
    };
    // Dispense prescription if it hasn't already been

    public dispense = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { pharmacistId } = req.body;

            const dispensedBy: IUser | null = await User.findOne({ _id: pharmacistId });
            if (!dispensedBy) { return res.status(4000).json('Farmacia no encontrada'); }

            const opts: any = { new: true };
            const dispensedAt = moment();

            const prescription: IPrescription | null = await Prescription.findOneAndUpdate({ _id: id, status: 'Pendiente' }, {
                status: 'Dispensada',
                dispensedBy: {
                    userId: dispensedBy?._id,
                    businessName: dispensedBy?.businessName,
                    cuil: dispensedBy?.cuil,
                },
                dispensedAt
            }, opts);

            if (!prescription) { return res.status(422).json('La receta ya había sido dispensada.'); }

            return res.status(200).json(prescription);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
            return res.status(500).json('Server Error');
        }
    };

    public cancelDispense = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { pharmacistId } = req.body;

            const dispensedBy: IUser | null = await User.findOne({ _id: pharmacistId });

            if (!dispensedBy) { return res.status(400).json('Farmacia no encontrada'); }

            const userRole: IRole | null = await Role.findOne({ role: 'admin', _id: { $in: dispensedBy.roles } }); // checkeamos el rol del usuario no sea admin

            const controlPrescription: IPrescription | null = await Prescription.findOne({ _id: id, status: 'Dispensada' });
            if (!controlPrescription) { return res.status(404).json('La receta no se encontró.'); }

            const limitTime = moment(controlPrescription.dispensedAt).add(2, 'hours'); // plus 2 hours to dispensedBy
            const timeNow = moment();

            /* Si ya pasó el tiempo valido para cancelar y no tiene rol admin, entonces cancelamos la accion */
            if (timeNow.isAfter(limitTime) && userRole?.role !== 'admin') { return res.status(422).json('Ya no se puede anular la dispensa de la receta.'); }

            const opts: any = { new: true };
            const prescription: IPrescription | null = await Prescription.findOneAndUpdate({ _id: id, status: 'Dispensada' }, {
                status: 'Pendiente',
                dispensedBy: {},
                dispensedAt: ''
            }, opts);

            return res.status(200).json(prescription);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
            return res.status(500).json('Server Error');
        }
    };

    public update = async (req: Request, res: Response): Promise<Response> => {
        const { id } = req.params;
        const { date, supplies, observation, diagnostic } = req.body;

        try {

            const prescription: IPrescription | null = await Prescription.findOne({ _id: id, status: 'Pendiente' });

            if (!prescription) { return res.status(400).json('No se encontró la prescripción, se encuentra dispensada o vencida'); }


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
                supplies: suppliesLoaded,
            }, opts);
            return res.status(200).json(updatedPrescription);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
            return res.status(500).json('Server Error');
        }
    };

    public delete = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params;
            const prescription = await Prescription.findOne({ _id: id });
            if (prescription?.status === 'Pendiente') {
                await Prescription.findByIdAndDelete(id);
                return res.status(200).json(prescription);
            } else {
                return res.status(422).json('La receta ya se ha dispensado y no puede ser eliminada.');
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
            return res.status(500).json('Server Error');
        }
    };

    public getCsv = async (req: Request, res: Response) => {
        const fechaDesde = moment(req.body.fechaDesde, 'YYYY-MM-DD').startOf('day').toDate();
        const fechaHasta = moment(req.body.fechaHasta, 'YYYY-MM-DD').endOf('day').toDate();
        const pipeline = [
            {
                $match: {
                    dispensedAt: { $gte: fechaDesde, $lte: fechaHasta },
                    status: 'Dispensada',
                    'dispensedBy.userId': new Types.ObjectId(req.body.pharmacistId)
                }
            },
            {
                $unwind: '$supplies'
            },
            {
                $project: {
                    _id: 0,
                    IdReceta: { $toString: '$_id' },
                    Medico: '$professional.businessName',
                    Matricula: '$professional.enrollment',
                    Farmacia: '$dispensedBy.businessName',
                    Farmacia_cuit: '$dispensedBy.cuil',
                    Droga: '$supplies.supply.name',
                    Cantidad: '$supplies.quantity',
                    Fecha_receta: {
                        $dateToString: {
                            date: '$date',
                            format: '%d/%m/%Y',
                            timezone: 'America/Argentina/Buenos_Aires'
                        }
                    },
                    Fecha_dispensa: {
                        $dateToString: {
                            date: '$dispensedAt',
                            format: '%d/%m/%Y',
                            timezone: 'America/Argentina/Buenos_Aires'
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
                    Farmacia_cuit: row.Farmacia_cuit,
                    Drogas: row.Droga,
                    Cantidad: row.Cantidad,
                    Fecha_receta: row.Fecha_receta,
                    Fecha_dispensa: row.Fecha_dispensa
                };
            }
        }).pipe(res);
    };

    private updateStatuses = async (professionalId = '', filterPatient = ''): Promise<void> => {
        const limitDate: Date = moment().subtract(30, 'day').startOf('day').toDate(); // expired control date
        // before search: update expired prescriptions, with status "Pendiente"
        await Prescription.updateMany({
            status: 'Pendiente',
            date: { $lt: limitDate },
            $or: [{
                'professional.userId': (professionalId !== '' ? professionalId : null)
            }, {
                'patient.dni': filterPatient
            }]
        }, {
            status: 'Vencida'
        });
    };

    private ensurePrescriptionIds = async (prescriptions: IPrescription[]): Promise<void> => {
        for (const prescription of prescriptions) {
            if (!prescription.prescriptionId) {
                const prescriptionId = generarIdDesdeFecha(prescription.createdAt || prescription.date);
                await Prescription.findByIdAndUpdate(prescription._id, { prescriptionId });
                prescription.prescriptionId = prescriptionId;
            }
        }
    };

    private getSupplies = (supplies: any[]) => {
        let drogs = '';
        supplies.forEach(sup => {
            drogs += `${sup.supply.name} - `;
        });
        return drogs;
    };

}


export default new PrescriptionController();
