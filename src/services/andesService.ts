import axios, { AxiosResponse } from 'axios';
import IPrescriptionAndes from '../interfaces/prescriptionAndes.interface';

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

            console.log('fullUrl', fullUrl);

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

    /**
     * Verifica si existe una receta vigente para un paciente y medicamento (por conceptId SNOMED) en ANDES
     */
    public async verificarRecetaExistente(dni: string, conceptId: string): Promise<any> {
        try {
            const url = `${this.baseURL}/modules/recetas/verificar`;
            console.log('fullUrl', url);

            const response: AxiosResponse<any> = await axios.get(url, {
                params: { documento: dni, conceptId },
                headers: {
                    Authorization: this.token,
                    'Content-Type': 'application/json'
                }
            });

            console.log('response', response.data);

            return response.data;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error al verificar receta existente en ANDES:', error);
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
