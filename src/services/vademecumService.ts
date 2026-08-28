import axios, { AxiosInstance } from 'axios';

export interface VademecumEntry {
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

interface ApiSuccess<T> {
    status: 'success';
    data: T;
}

interface ApiError {
    status: 'error';
    error: { code: string; message: string };
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

class VademecumService {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: process.env.VADEMECUM_MS_URL || 'http://localhost:4001',
            timeout: 10000,
            headers: {
                'X-Api-Key': process.env.VADEMECUM_API_KEY || '',
            },
        });
    }

    public searchMedications = async (term: string, limit = 20): Promise<VademecumEntry[]> => {
        const res = await this.client.get<ApiResponse<VademecumEntry[]>>('/api/medications', {
            params: { q: term, limit },
        });
        if (res.data.status === 'success') { return res.data.data; }
        throw new Error(res.data.error.message);
    };

    public getMedicationById = async (id: number): Promise<VademecumEntry | null> => {
        try {
            const res = await this.client.get<ApiResponse<VademecumEntry>>(`/api/medications/${id}`);
            if (res.data.status === 'success') { return res.data.data; }
            return null;
        } catch {
            return null;
        }
    };

    public getMedicationBySnomed = async (snomed: string): Promise<VademecumEntry | null> => {
        try {
            const res = await this.client.get<ApiResponse<VademecumEntry>>('/api/medications', {
                params: { snomed },
            });
            if (res.data.status === 'success') { return res.data.data; }
            return null;
        } catch {
            return null;
        }
    };
}

export default new VademecumService();
