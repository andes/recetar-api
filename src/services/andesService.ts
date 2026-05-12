import axios, { AxiosResponse } from 'axios';
import { Request, Response } from 'express';
import IPrescriptionAndes from '../interfaces/prescriptionAndes.interface';
import PrescriptionAndes from '../models/prescriptionAndes.model';

interface GetPrescriptionsParams {
    professionalId: string;
    estadoReceta?: 'pendiente' | 'dispensada' | 'vencida' | 'finalizada' | 'suspendida' | 'rechazada';
    desde?: string; // formato YYYY-MM-DD
    hasta?: string; // formato YYYY-MM-DD
}

interface GetPrescriptionsByPatientParams {
    documento: string;
    sexo?: 'masculino' | 'femenino';
    estado?: 'vigente' | 'pendiente' | 'dispensada' | 'vencida' | 'finalizada' | 'suspendida' | 'rechazada';
}

class AndesService {
    private baseURL: string;
    private token: string;

    constructor() {
        this.baseURL = process.env.ANDES_ENDPOINT || '';
        this.token = process.env.JWT_MPI_TOKEN || '';
        if (!this.baseURL || !this.token) {
            throw new Error('ANDES_ENDPOINT y JWT_MPI_TOKEN deben estar configurados en las variables de entorno');
        }
    }

    public async getFromAndes(req: Request, res: Response): Promise<Response> {
        try {
            if (!req.query.dni) { return res.status(400).json({ mensaje: 'Missing required params!' }); }
            const dni = req.query.dni as string;
            const sexo = req.query.sexo ? (req.query.sexo as any) : undefined;
            let prescriptions: IPrescriptionAndes[] | null = [];
            let andesPrescriptions: IPrescriptionAndes[] | null = null;

            andesPrescriptions = await this.getPrescriptionsByPatient({ documento: dni, estado: 'vigente', sexo });

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
    }

    public async searchProfessionals(req: Request, res: Response): Promise<Response> {
        const { documento } = req.query;

        if (!documento) {
            return res.status(400).json({
                ok: false,
                message: 'El parámetro "documento" es requerido'
            });
        }

        try {
            const professionals = await this.searchProfessionalsGuide(documento as string);

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
    }

    public async searchPharmacies(req: Request, res: Response): Promise<Response> {
        const { cuit } = req.query;

        if (!cuit) {
            return res.status(400).json({
                ok: false,
                message: 'El parámetro "cuit" es requerido'
            });
        }

        try {
            let cuitStr = cuit as string;
            let altCuit = '';

            if (/^\d{11}$/.test(cuitStr)) {
                altCuit = `${cuitStr.slice(0, 2)}-${cuitStr.slice(2, 10)}-${cuitStr.slice(10)}`;
            } else if (/^\d{2}-\d{8}-\d{1}$/.test(cuitStr)) {
                altCuit = cuitStr.replace(/-/g, '');
            }

            let pharmacies = await this.searchPharmaciesCore(cuitStr);

            if ((!pharmacies || pharmacies.length === 0) && altCuit) {
                pharmacies = await this.searchPharmaciesCore(altCuit);
            }

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
    }

    public async getPrescriptionsByPatient(params: GetPrescriptionsByPatientParams): Promise<IPrescriptionAndes[]> {
        try {
            const url = `${this.baseURL}/modules/recetas`;
            const queryParams = new URLSearchParams();

            queryParams.append('documento', params.documento);
            if (params.estado) {
                queryParams.append('estado', params.estado);
            }
            if (params.sexo) {
                queryParams.append('sexo', params.sexo);
            }

            const fullUrl = queryParams.toString() ? `${url}?${queryParams.toString()}` : url;

            const response: AxiosResponse<IPrescriptionAndes[]> = await axios.get(fullUrl, {
                headers: {
                    Authorization: this.token,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error al obtener prescripciones por paciente desde ANDES:', error);
            throw error;
        }
    }

    public async searchProfessionalsGuide(documento: string): Promise<any[]> {
        try {
            const url = `${this.baseURL}/core/tm/profesionales/guia?documento=${documento}`;
            const response: AxiosResponse<any[]> = await axios.get(url, {
                headers: {
                    Authorization: this.token,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error al buscar profesionales guía en ANDES:', error);
            throw error;
        }
    }

    public async searchPharmaciesCore(cuit: string): Promise<any[]> {
        try {
            const url = `${this.baseURL}/core/tm/farmacias?cuit=${cuit}`;
            const response: AxiosResponse<any[]> = await axios.get(url, {
                headers: {
                    Authorization: this.token,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error al buscar farmacias en ANDES:', error);
            throw error;
        }
    }



    public async patchPrescription(body: any): Promise<any> {
        try {
            const url = `${this.baseURL}/modules/recetas`;
            const response: AxiosResponse = await axios.patch(url, body, {
                headers: {
                    Authorization: this.token,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error al realizar patch en recetas de ANDES:', error);
            throw error;
        }
    }

    /**
     * Obtiene las prescripciones de un profesional desde ANDES
     */
    public async getPrescriptionsByProfessional(params: GetPrescriptionsParams): Promise<IPrescriptionAndes[]> {
        try {
            const url = `${this.baseURL}/modules/recetas/profesional/${params.professionalId}`;
            const queryParams = new URLSearchParams();

            if (params.estadoReceta) {
                queryParams.append('estadoReceta', params.estadoReceta);
            }
            if (params.desde) {
                queryParams.append('desde', params.desde);
            }
            if (params.hasta) {
                queryParams.append('hasta', params.hasta);
            }
            queryParams.append('origenExternoApp', 'recetar');
            queryParams.append('excluirEstado', 'pendiente');
            queryParams.append('excluirEstado', 'eliminada');

            const fullUrl = queryParams.toString() ? `${url}?${queryParams.toString()}` : url;

            const response: AxiosResponse<IPrescriptionAndes[]> = await axios.get(fullUrl, {
                headers: {
                    Authorization: this.token,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error al obtener prescripciones por profesional desde ANDES:', error);
            throw error;
        }
    }

    public async suspendPrescription(recetaId: string, motivo: string, observacion?: string, profesional?: any): Promise<any> {
        try {
            const url = `${this.baseURL}/modules/recetas`;
            const body = {
                op: 'suspender',
                recetaId,
                motivo,
                observacion,
                profesional,
                fecha: new Date()
            };
            const response: AxiosResponse = await axios.patch(url, body, {
                headers: {
                    Authorization: this.token,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error al suspender la prescripción en ANDES:', error);
            throw error;
        }
    };
} export default new AndesService();
