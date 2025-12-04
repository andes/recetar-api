import axios, { AxiosResponse } from 'axios';
import IPrescriptionAndes from '../interfaces/prescriptionAndes.interface';

interface GetPrescriptionsParams {
    professionalId: string;
    estadoReceta?: 'pendiente' | 'dispensada' | 'vencida' | 'finalizada' | 'suspendida' | 'rechazada';
    desde?: string; // formato YYYY-MM-DD
    hasta?: string; // formato YYYY-MM-DD
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

    /**
     * Busca stock de un insumo específico desde ANDES
     */
    public async searchStock(params: { insumo: string, tipos?: string }): Promise<any[]> {
        try {
            let url = `${this.baseURL}/modules/insumos?insumo=^${params.insumo}`;

            if (params.tipos) {
                const tipos = params.tipos.split(',');
                tipos.forEach(tipo => {
                    url += `&tipo=${tipo.trim()}`;
                });
            }

            const response: AxiosResponse = await axios.get(url, {
                headers: {
                    Authorization: this.token,
                    'Content-Type': 'application/json'
                }
            });

            return Array.isArray(response.data) ? response.data : [response.data];
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error al buscar stock desde ANDES:', error);
            throw error;
        }
    }

    /**
     * Obtiene todo el stock de insumos desde ANDES
     */
    public async getAllStock(): Promise<any> {
        try {
            const url = `${this.baseURL}/modules/insumos`;

            const response: AxiosResponse = await axios.get(url, {
                headers: {
                    Authorization: this.token,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error al obtener todo el stock desde ANDES:', error);
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

    public async suspendPrescription(prescriptions: [string], motivo: string, observacion?: string, profesional?: any): Promise<any> {
        try {
            const url = `${this.baseURL}/modules/recetas`;
            const body = {
                op: 'suspender',
                recetas: prescriptions,
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
