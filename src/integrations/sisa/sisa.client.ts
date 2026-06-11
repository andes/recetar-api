import axios, { AxiosInstance } from 'axios';
import { InternalError } from '../../shared/errors';
import { SisaOrganization, SisaOrganizationDetail } from './sisa.types';
import { SisaMapper } from './sisa.mapper';

export interface SisaClientConfig {
    url: string;
    username: string;
    password: string;
    provincia?: number;
}

export class SisaClient {
    private client: AxiosInstance;
    private configured: boolean;
    private username: string;
    private password: string;
    private provincia: number;

    constructor(config?: SisaClientConfig) {
        this.configured = !!(config?.url && config?.username && config?.password);
        this.username = config?.username || '';
        this.password = config?.password || '';
        this.provincia = config?.provincia || 15;

        this.client = axios.create({
            baseURL: config?.url || '',
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    private ensureConfigured(): void {
        if (!this.configured) {
            throw new InternalError('SISA client is not configured');
        }
    }

    async searchOrganizations(name: string): Promise<SisaOrganization[]> {
        this.ensureConfigured();
        const response = await this.client.post('buscar', {
            usuario: this.username,
            clave: this.password,
        }, {
            params: { nombre: name, provincia: this.provincia },
        });
        return SisaMapper.parseResponse(response.data);
    }

    async getOrganizationDetail(codigo: string): Promise<SisaOrganizationDetail | null> {
        this.ensureConfigured();
        const response = await this.client.post(codigo, {
            usuario: this.username,
            clave: this.password,
        });
        return SisaMapper.parseDetailResponse(response.data);
    }
}
