import axios, { AxiosInstance } from 'axios';
import { InternalError } from '../../shared/errors';
import {
    PraxisAuthenticationError,
    PraxisPrescriptionError,
} from './praxis.errors';
import {
    PraxisPrescriptionRequest,
    PraxisPrescriptionResponse,
    PraxisErrorResponse,
    PraxisMensaje,
} from './praxis.types';

export interface PraxisClientConfig {
    praxisEndpoint: string;
    praxisApiKey: string;
}

export class PraxisClient {
    private client: AxiosInstance;
    private configured: boolean;

    constructor(config?: PraxisClientConfig) {
        const resolvedEndpoint = config?.praxisEndpoint || process.env.PRAXYS_ENDPOINT || '';
        const resolvedApiKey = config?.praxisApiKey || process.env.PRAXYS_API_KEY || '';

        this.configured = !!(resolvedEndpoint && resolvedApiKey);
        this.client = axios.create({
            baseURL: resolvedEndpoint,
            headers: {
                'x-api-key': resolvedApiKey,
                'Content-Type': 'application/json',
            },
        });
    }

    private ensureConfigured(): void {
        if (!this.configured) {
            throw new InternalError('Praxis no está configurado. Verifique PRAXYS_ENDPOINT y PRAXYS_API_KEY.');
        }
    }

    async createPrescription(payload: PraxisPrescriptionRequest): Promise<PraxisPrescriptionResponse> {
        this.ensureConfigured();
        try {
            const response = await this.client.post<PraxisPrescriptionResponse>(
                'api/v2/prescripcion',
                payload
            );
            const data = response.data;
            const errores = (data.mensajes || []).filter(mensaje => mensaje.severidad === 'E');
            if (errores.length) {
                throw new PraxisPrescriptionError(this.describeMessages(errores));
            }
            return data;
        } catch (error) {
            if (error instanceof PraxisPrescriptionError || error instanceof PraxisAuthenticationError) {
                throw error;
            }
            if (axios.isAxiosError(error) && error.response) {
                const status = error.response.status;
                const data = error.response.data as Partial<PraxisPrescriptionResponse> & Partial<PraxisErrorResponse>;
                const detail = this.describeError(data, error.message);
                if (status === 401 || status === 403) {
                    throw new PraxisAuthenticationError(detail);
                }
                throw new PraxisPrescriptionError(detail);
            }
            throw error;
        }
    }

    private describeMessages(mensajes: PraxisMensaje[]): string {
        const detail = mensajes.map(mensaje => mensaje.mensaje).filter(Boolean).join(' | ');
        return detail || 'Praxis rechazó la prescripción';
    }

    private describeError(
        data: Partial<PraxisPrescriptionResponse> & Partial<PraxisErrorResponse>,
        fallback: string,
    ): string {
        const mensajes = (data.mensajes || []).map(mensaje => mensaje.mensaje).filter(Boolean);
        if (mensajes.length) {
            return `Error de Praxis: ${mensajes.join(' | ')}`;
        }
        return `Error de Praxis: ${data.mensaje || data.error || fallback}`;
    }

    async getPrescriptionPdf(idPrescripcion: string): Promise<{ pdf: string; contentType: string }> {
        this.ensureConfigured();
        try {
            const response = await this.client.get(
                `api/prescripciones/${idPrescripcion}/pdf`,
                { responseType: 'arraybuffer' }
            );
            return {
                pdf: Buffer.from(response.data).toString('base64'),
                contentType: response.headers['content-type'] || 'application/pdf',
            };
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const errorData = error.response.data as PraxisErrorResponse;
                throw new InternalError(
                    `Error al obtener PDF de Praxis: ${errorData.mensaje || error.message}`
                );
            }
            throw error;
        }
    }

    async annulPrescription(idPrescripcion: string): Promise<void> {
        this.ensureConfigured();
        try {
            await this.client.delete(`api/prescripciones/${idPrescripcion}`);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const errorData = error.response.data as PraxisErrorResponse;
                throw new InternalError(
                    `Error al anular prescripción en Praxis: ${errorData.mensaje || error.message}`
                );
            }
            throw error;
        }
    }
}
