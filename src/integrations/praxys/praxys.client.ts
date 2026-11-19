import axios, { AxiosInstance } from 'axios';
import { InternalError } from '../../shared/errors';
import {
    PraxysPrescriptionRequest,
    PraxysPrescriptionResponse,
    PraxysErrorResponse,
    PraxysAnnulmentResponse,
    PraxysMensaje,
} from './praxys.types';
import { PraxysAuthenticationError, PraxysNotEligibleError, PraxysResponseError } from './praxys.errors';
import { checkPraxysEligibility } from './praxys.eligibility';

export interface PraxysClientConfig {
    praxysEndpoint: string;
    praxysApiKey: string;
}

export class PraxysClient {
    private client: AxiosInstance;
    private configured: boolean;

    constructor(config?: PraxysClientConfig) {
        const resolvedEndpoint = config?.praxysEndpoint || process.env.PRAXYS_ENDPOINT || '';
        const resolvedApiKey = config?.praxysApiKey || process.env.PRAXYS_API_KEY || '';

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
            throw new InternalError('Praxys no está configurado. Verifique PRAXYS_ENDPOINT y PRAXYS_API_KEY.');
        }
    }

    isConfigured(): boolean {
        return this.configured;
    }

    private firstErrorMensaje(mensajes?: PraxysMensaje[]): PraxysMensaje | undefined {
        if (!mensajes?.length) {
            return undefined;
        }
        return mensajes.find((mensaje) => mensaje.severidad === 'E');
    }

    async createPrescription(payload: PraxysPrescriptionRequest): Promise<PraxysPrescriptionResponse> {
        this.ensureConfigured();

        const eligibility = checkPraxysEligibility(payload);
        if (!eligibility.eligible) {
            throw new PraxysNotEligibleError(eligibility.reason || 'Receta no elegible para Praxys');
        }

        try {
            const response = await this.client.post<PraxysPrescriptionResponse>(
                'api/v2/prescripcion',
                payload
            );
            const data = response.data;
            const errorMensaje = this.firstErrorMensaje(data?.mensajes);
            if (errorMensaje) {
                throw new PraxysResponseError(errorMensaje.mensaje, errorMensaje.codigo, errorMensaje.severidad);
            }
            return data;
        } catch (error) {
            if (error instanceof PraxysNotEligibleError || error instanceof PraxysResponseError) {
                throw error;
            }
            if (axios.isAxiosError(error) && error.response) {
                const errorData = error.response.data as PraxysErrorResponse;
                const mensaje = this.firstErrorMensaje(errorData?.mensajes) || errorData?.mensajes?.[0];
                if (mensaje) {
                    throw new PraxysResponseError(mensaje.mensaje, mensaje.codigo, mensaje.severidad);
                }
                if (error.response.status === 401 || error.response.status === 403) {
                    throw new PraxysAuthenticationError(
                        `Error de autenticación con Praxys: ${errorData?.mensaje || errorData?.error || error.message}`
                    );
                }
                throw new InternalError(
                    `Error de Praxys: ${errorData?.mensaje || errorData?.error || error.message}`
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
                const errorData = error.response.data as PraxysErrorResponse;
                throw new InternalError(
                    `Error al obtener PDF de Praxys: ${errorData?.mensaje || error.message}`
                );
            }
            throw error;
        }
    }

    async annulPrescription(idPrescripcion: string, hash: string): Promise<void> {
        this.ensureConfigured();
        try {
            const response = await this.client.delete<PraxysAnnulmentResponse>(
                `api/prescripciones/${idPrescripcion}`,
                { params: { hash } }
            );
            if (response.data && response.data.anulacionExitosa === false) {
                throw new PraxysResponseError(
                    response.data.mensaje || 'No se pudo anular la prescripción en Praxys',
                    response.data.codigo,
                    response.data.severidad
                );
            }
        } catch (error) {
            if (error instanceof PraxysResponseError) {
                throw error;
            }
            if (axios.isAxiosError(error) && error.response) {
                const errorData = error.response.data as PraxysAnnulmentResponse;
                throw new InternalError(
                    `Error al anular prescripción en Praxys: ${errorData?.mensaje || error.message}`
                );
            }
            throw error;
        }
    }
}
