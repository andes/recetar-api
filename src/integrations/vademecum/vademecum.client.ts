import axios, { AxiosInstance } from 'axios';
import { env } from '../../config/config';

interface VademecumEntry {
    id: number;
    estado: string;
    nombre: string;
    presentacion: string;
    importado: string;
    heladera: string;
    troquel: string;
    codigoDeBarras: string[];
    atcs: string[];
    iva: string;
    laboratorio: number;
    tipoDeVenta: number;
    controlSaludPublica: number;
    tamanio: number;
    forma: number;
    via: number;
    droga: number;
    accion: number;
    vigencia: string;
    precio: number;
    unidadPotencia: number;
    potencia: string;
    unidadUnidades: number;
    unidades: number;
    gtins: string[];
    gravamen: string;
    celiacos: string;
    snomed: string;
    ndrogas: Array<{ ndroga: number; pvalor: string; punidad: number }>;
    cobs: Record<string, unknown>;
    prospecto: number;
    fecha_act: string;
    droga_descrip?: string;
    accion_descrip?: string;
}

interface Drug {
    id: number;
    descripcion: string;
}

interface Action {
    id: number;
    descripcion: string;
}

interface VademecumStats {
    ultimolog: string | null;
    cant_med: number;
    cant_drogas: number;
    cant_acciones: number;
    fecha_act: string | null;
}

interface ApiSuccess<T> {
    status: 'success';
    data: T;
}

interface ApiError {
    status: 'error';
    error: { code: string; message: string };
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

export class VademecumClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: env.VADEMECUM_MS_URL,
            timeout: 10000,
            headers: {
                'X-Api-Key': env.VADEMECUM_API_KEY,
            },
        });
    }

    async searchMedications(term: string, limit = 20): Promise<VademecumEntry[]> {
        const res = await this.client.get<ApiResponse<VademecumEntry[]>>('/api/medications', {
            params: { q: term, limit },
        });
        if (res.data.status === 'success') {return res.data.data;}
        throw new Error(res.data.error.message);
    }

    async getMedicationById(id: number): Promise<VademecumEntry | null> {
        try {
            const res = await this.client.get<ApiResponse<VademecumEntry>>(`/api/medications/${id}`);
            if (res.data.status === 'success') {return res.data.data;}
            return null;
        } catch {
            return null;
        }
    }

    async searchMedicationsBySnomed(snomed: string): Promise<VademecumEntry | null> {
        try {
            const res = await this.client.get<ApiResponse<VademecumEntry>>('/api/medications', {
                params: { snomed },
            });
            if (res.data.status === 'success') {return res.data.data;}
            return null;
        } catch {
            return null;
        }
    }

    async searchDrugs(term?: string, limit = 20): Promise<Drug[]> {
        const res = await this.client.get<ApiResponse<Drug[]>>('/api/drugs', {
            params: { q: term, limit },
        });
        if (res.data.status === 'success') {return res.data.data;}
        throw new Error(res.data.error.message);
    }

    async searchActions(term?: string, limit = 20): Promise<Action[]> {
        const res = await this.client.get<ApiResponse<Action[]>>('/api/actions', {
            params: { q: term, limit },
        });
        if (res.data.status === 'success') {return res.data.data;}
        throw new Error(res.data.error.message);
    }

    async getStats(): Promise<VademecumStats> {
        const res = await this.client.get<ApiResponse<VademecumStats>>('/api/stats');
        if (res.data.status === 'success') {return res.data.data;}
        throw new Error(res.data.error.message);
    }
}
