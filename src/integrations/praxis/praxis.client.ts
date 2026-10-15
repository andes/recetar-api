import axios, { AxiosInstance } from 'axios';
import { InternalError } from '../../shared/errors';
import {
    PraxisPrescriptionRequest,
    PraxisPrescriptionResponse,
    PraxisErrorResponse,
    PraxisAnnulmentResponse,
    PraxisMensaje,
} from './praxis.types';
import { PraxisNotEligibleError, PraxisResponseError } from './praxis.errors';
import { checkPraxisEligibility } from './praxis.eligibility';

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

    isConfigured(): boolean {
        return this.configured;
    }

    private firstErrorMensaje(mensajes?: PraxisMensaje[]): PraxisMensaje | undefined {
        if (!mensajes?.length) {
            return undefined;
        }
        return mensajes.find((mensaje) => mensaje.severidad === 'E');
    }

    async createPrescription(payload: PraxisPrescriptionRequest): Promise<PraxisPrescriptionResponse> {
        this.ensureConfigured();

        const eligibility = checkPraxisEligibility(payload);
        if (!eligibility.eligible) {
            throw new PraxisNotEligibleError(eligibility.reason || 'Receta no elegible para Praxis');
        }

        try {
            const response = await this.client.post<PraxisPrescriptionResponse>(
                'api/v2/prescripcion',
                payload
            );
            const data = response.data;
            const errorMensaje = this.firstErrorMensaje(data?.mensajes);
            if (errorMensaje) {
                throw new PraxisResponseError(errorMensaje.mensaje, errorMensaje.codigo, errorMensaje.severidad);
            }
            return data;
        } catch (error) {
            if (error instanceof PraxisNotEligibleError || error instanceof PraxisResponseError) {
                throw error;
            }
            if (axios.isAxiosError(error) && error.response) {
                const errorData = error.response.data as PraxisErrorResponse;
                const mensaje = this.firstErrorMensaje(errorData?.mensajes) || errorData?.mensajes?.[0];
                if (mensaje) {
                    throw new PraxisResponseError(mensaje.mensaje, mensaje.codigo, mensaje.severidad);
                }
                throw new InternalError(
                    `Error de Praxis: ${errorData?.mensaje || errorData?.error || error.message}`
                );
            }
            throw error;
        }
    }

    async getPrescriptionPdf(idPrescripcion: string, hash: string): Promise<{ pdf: string; contentType: string }> {
        this.ensureConfigured();
        try {
            const response = await this.client.get(
                `api/prescripciones/${idPrescripcion}/pdf`,
                { params: { hash }, responseType: 'arraybuffer' }
            );
            return {
                pdf: Buffer.from(response.data).toString('base64'),
                contentType: response.headers['content-type'] || 'application/pdf',
            };
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const errorData = error.response.data as PraxisErrorResponse;
                throw new InternalError(
                    `Error al obtener PDF de Praxis: ${errorData?.mensaje || error.message}`
                );
            }
            throw error;
        }
    }

    async annulPrescription(idPrescripcion: string, hash: string): Promise<void> {
        this.ensureConfigured();
        try {
            const response = await this.client.delete<PraxisAnnulmentResponse>(
                `api/prescripciones/${idPrescripcion}`,
                { params: { hash } }
            );
            if (response.data && response.data.anulacionExitosa === false) {
                throw new PraxisResponseError(
                    response.data.mensaje || 'No se pudo anular la prescripción en Praxis',
                    response.data.codigo,
                    response.data.severidad
                );
            }
        } catch (error) {
            if (error instanceof PraxisResponseError) {
                throw error;
            }
            if (axios.isAxiosError(error) && error.response) {
                const errorData = error.response.data as PraxisAnnulmentResponse;
                throw new InternalError(
                    `Error al anular prescripción en Praxis: ${errorData?.mensaje || error.message}`
                );
            }
            throw error;
        }
    }
}
