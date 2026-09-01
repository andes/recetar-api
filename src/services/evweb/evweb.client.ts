import axios, { AxiosInstance } from 'axios';
import {
    EvwebConfig,
    EvwebLoginResponse,
    EvwebCIE10,
    EvwebMedicamento,
    EvwebObraSocial,
    EvwebRecetaRequest,
    EvwebRecetaCreateResponse,
    EvwebRecetaResponse,
    EvwebPrescripcionRequest,
    EvwebPrescripcionResponse,
    EvwebQuemarRequest,
    EvwebQuemarResponse,
    EvwebBusquedaRecetaResponse,
    EvwebAnularRequest,
} from './evweb.types';

export class EvwebClient {
    private http: AxiosInstance;
    private token: string | null = null;
    private tokenExpiry: Date | null = null;
    private config: EvwebConfig;

    constructor(config: EvwebConfig) {
        this.config = config;
        this.http = axios.create({
            baseURL: config.endpoint,
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
        });
    }

    static isConfigured(): boolean {
        return !!(process.env.EVWEB_ENDPOINT && process.env.EVWEB_USERNAME && process.env.EVWEB_PASSWORD);
    }

    static fromEnv(): EvwebClient | null {
        if (!EvwebClient.isConfigured()) {
            return null;
        }
        return new EvwebClient({
            endpoint: process.env.EVWEB_ENDPOINT!,
            username: process.env.EVWEB_USERNAME!,
            password: process.env.EVWEB_PASSWORD!,
            provincia: process.env.EVWEB_PROVINCIA || 'Neuquén',
        });
    }

    private async ensureToken(): Promise<string> {
        if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.token;
        }

        const response = await this.http.post<EvwebLoginResponse>('/api/login', {
            username: this.config.username,
            password: this.config.password,
        });

        this.token = response.data.jwt;
        // Token expira en la fecha que devuelve evWeb; restamos 5 minutos como margen
        const expDate = new Date(response.data.exp);
        expDate.setMinutes(expDate.getMinutes() - 5);
        this.tokenExpiry = expDate;

        return this.token;
    }

    private async authRequest<T>(method: string, url: string, data?: any, params?: any): Promise<T> {
        const token = await this.ensureToken();
        const config: any = {
            method,
            url,
            headers: { Authorization: `Bearer ${token}` },
        };
        if (data) { config.data = data; }
        if (params) { config.params = params; }

        const response = await this.http.request<T>(config);
        return response.data;
    }

    // ─── Datos de referencia ───────────────────────────────────────────────

    async searchCIE10(query: string): Promise<EvwebCIE10[]> {
        return this.authRequest<EvwebCIE10[]>('GET', '/api/CIE10', undefined, { query, t: 225 });
    }

    async searchMedicamentos(query: string, monodroga?: string): Promise<EvwebMedicamento[]> {
        const params: any = { query, t: 225 };
        if (monodroga) { params.monodroga = monodroga; }
        return this.authRequest<EvwebMedicamento[]>('GET', '/api/medicamentos', undefined, params);
    }

    async searchObrasSociales(query: string): Promise<EvwebObraSocial[]> {
        return this.authRequest<EvwebObraSocial[]>('GET', '/api/consultas/os', undefined, { query });
    }

    // ─── Recetas ───────────────────────────────────────────────────────────

    async crearReceta(receta: EvwebRecetaRequest): Promise<EvwebRecetaCreateResponse> {
        return this.authRequest<EvwebRecetaCreateResponse>('POST', '/api/recetas', receta, undefined);
    }

    async getRecetaById(id: string): Promise<EvwebRecetaResponse> {
        return this.authRequest<EvwebRecetaResponse>('GET', `/api/recetas/${id}`);
    }

    async getRecetasByAfiliado(dni: number, pageSize = 20, pageNumber = 1): Promise<EvwebRecetaResponse[]> {
        return this.authRequest<EvwebRecetaResponse[]>('GET', `/api/recetas/afiliado/${dni}`, undefined, {
            pageSize,
            pageNumber,
        });
    }

    async getRecetasByMedico(cuit: number, pageSize = 20, pageNumber = 1): Promise<EvwebRecetaResponse[]> {
        return this.authRequest<EvwebRecetaResponse[]>('GET', `/api/recetas/medico/${cuit}`, undefined, {
            pageSize,
            pageNumber,
        });
    }

    async quemarReceta(id: string): Promise<any> {
        return this.authRequest<any>('DELETE', `/api/recetas/quemar/${id}`);
    }

    async anularReceta(id: string, motivo: string): Promise<any> {
        return this.authRequest<any>('POST', `/api/recetas/anular/${id}`, { Motivo: motivo } as EvwebAnularRequest);
    }

    // ─── Prescripciones (estudios/prácticas) ───────────────────────────────

    async crearPrescripcion(prescripcion: EvwebPrescripcionRequest): Promise<EvwebPrescripcionResponse> {
        return this.authRequest<EvwebPrescripcionResponse>('POST', '/api/prescripciones', prescripcion);
    }

    async getPrescripcionById(id: string): Promise<EvwebPrescripcionResponse> {
        return this.authRequest<EvwebPrescripcionResponse>('GET', `/api/prescripciones/${id}`);
    }

    async getPrescripcionesByAfiliado(dni: number): Promise<EvwebPrescripcionResponse[]> {
        return this.authRequest<EvwebPrescripcionResponse[]>('GET', `/api/prescripciones/afiliado/${dni}`);
    }

    // ─── Validador ─────────────────────────────────────────────────────────

    async buscarRecetasValidador(params: {
        codigoReferencia?: number;
        nroBeneficiario?: string;
    }): Promise<EvwebBusquedaRecetaResponse[]> {
        return this.authRequest<EvwebBusquedaRecetaResponse[]>('GET', '/api/validador/recetas', undefined, params);
    }

    async quemarRecetaValidador(data: EvwebQuemarRequest): Promise<EvwebQuemarResponse> {
        return this.authRequest<EvwebQuemarResponse>('POST', '/api/validador/autorizaciones', data);
    }

    async eliminarQuemado(id: string): Promise<any> {
        return this.authRequest<any>('DELETE', `/api/validador/autorizaciones/${id}`);
    }
}
