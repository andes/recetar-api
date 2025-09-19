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

    public async suspendPrescription(prescriptionId: string, reason: string): Promise<void> {
        try {
            const url = `${this.baseURL}/modules/recetas`;
            await axios.post(url, { reason }, {
                headers: {
                    Authorization: this.token,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error al suspender la prescripción en ANDES:', error);
            throw error;
        }
    };
} export default new AndesService();
