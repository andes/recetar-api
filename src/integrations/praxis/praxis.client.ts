import axios, { AxiosInstance } from 'axios';
import { InternalError } from '../../shared/errors';
import {
    PraxisPrescriptionRequest,
    PraxisPrescriptionResponse,
    PraxisErrorResponse,
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
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const errorData = error.response.data as PraxisErrorResponse;
                throw new InternalError(
                    `Error de Praxis: ${errorData.mensaje || error.message}`
                );
            }
            throw error;
        }
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
