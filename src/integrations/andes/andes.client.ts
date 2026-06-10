import axios, { AxiosInstance } from 'axios';
import { InternalError } from '../../shared/errors';
import { andesMessages } from './lang';
import {
    AndesPrescription,
    AndesStockItem,
    AndesInsumoPayload,
    AndesSuspendPayload,
    AndesMPIPatient,
    AndesCoverage,
    AndesOrganization,
    AndesSnomedConcept,
    GetPrescriptionsByPatientParams,
    GetPrescriptionsByProfessionalParams,
    GetPrescriptionsByDniParams,
} from './andes.types';

export interface AndesClientConfig {
    andesEndpoint: string;
    jwtMpiToken: string;
    mpiEndpoint: string;
}

export class AndesClient {
    private client: AxiosInstance;
    private configured: boolean;
    private mpiEndpoint: string;

    constructor(config?: AndesClientConfig) {
        const resolvedEndpoint = config?.andesEndpoint || '';
        const resolvedToken = config?.jwtMpiToken || '';
        this.mpiEndpoint = config?.mpiEndpoint || '';

        this.configured = !!(resolvedEndpoint && resolvedToken);
        this.client = axios.create({
            baseURL: resolvedEndpoint,
            headers: {
                Authorization: resolvedToken,
                'Content-Type': 'application/json',
            },
        });
    }

    private ensureConfigured(): void {
        if (!this.configured) {
            const error = new InternalError('');
            error.message = andesMessages.errors.configError;
            throw error;
        }
    }

    async getPrescriptionsByPatient(params: GetPrescriptionsByPatientParams): Promise<AndesPrescription[]> {
        this.ensureConfigured();
        const response = await this.client.get<AndesPrescription[]>('/modules/recetas', {
            params: {
                documento: params.documento,
                ...(params.estado && { estado: params.estado }),
                ...(params.sexo && { sexo: params.sexo }),
            },
        });
        return response.data;
    }

    async getPrescriptionsByProfessional(params: GetPrescriptionsByProfessionalParams): Promise<AndesPrescription[]> {
        this.ensureConfigured();
        const response = await this.client.get<AndesPrescription[]>(
            `/modules/recetas/profesional/${params.professionalId}`,
            {
                params: {
                    ...(params.estadoReceta && { estadoReceta: params.estadoReceta }),
                    ...(params.desde && { desde: params.desde }),
                    ...(params.hasta && { hasta: params.hasta }),
                    origenExternoApp: 'recetar',
                    excluirEstado: 'pendiente,eliminada',
                },
            }
        );
        return response.data;
    }

    async getPrescriptionsByDni(params: GetPrescriptionsByDniParams): Promise<AndesPrescription[]> {
        this.ensureConfigured();
        const response = await this.client.get<AndesPrescription[]>('/modules/recetas/filtros', {
            params: {
                documento: params.dni,
                sexo: params.sexo,
                estado: params.status || 'vigente',
                ...(params.dateFrom && { fechaInicio: params.dateFrom }),
                ...(params.dateTo && { fechaFin: params.dateTo }),
            },
        });
        return response.data;
    }

    async verificarRecetaExistente(dni: string, conceptId: string, sexo: string): Promise<unknown> {
        this.ensureConfigured();
        const response = await this.client.get('/modules/recetas/verificar', {
            params: { documento: dni, conceptId, sexo },
        });
        return response.data;
    }

    async searchProfessionalsGuide(documento: string): Promise<unknown[]> {
        this.ensureConfigured();
        const response = await this.client.get<unknown[]>('/core/tm/profesionales/guia', {
            params: { documento },
        });
        return response.data;
    }

    async searchPharmaciesCore(cuit: string): Promise<unknown[]> {
        this.ensureConfigured();
        const response = await this.client.get<unknown[]>('/core/tm/farmacias', {
            params: { cuit },
        });
        return response.data;
    }

    async searchStock(insumo: string, tipos?: string): Promise<AndesStockItem[]> {
        let url = `/modules/insumos?nombre=^${insumo}`;
        if (tipos) {
            tipos.split(',').forEach(tipo => { url += `&tipo=${tipo.trim()}`; });
        }
        this.ensureConfigured();
        const response = await this.client.get<AndesStockItem[]>(url);
        return Array.isArray(response.data) ? response.data : [response.data];
    }

    async getAllStock(): Promise<AndesStockItem[]> {
        this.ensureConfigured();
        const response = await this.client.get<AndesStockItem[]>('/modules/insumos');
        return response.data;
    }

    async sendPrescription(payload: AndesInsumoPayload): Promise<unknown> {
        this.ensureConfigured();
        const response = await this.client.post('/modules/recetas', payload);
        return response.data;
    }

    async updatePrescription(body: Record<string, unknown>): Promise<unknown> {
        this.ensureConfigured();
        const response = await this.client.patch('/modules/recetas', body);
        return response.data;
    }

    async suspendPrescription(payload: AndesSuspendPayload): Promise<unknown> {
        this.ensureConfigured();
        const response = await this.client.patch('/modules/recetas', payload);
        return response.data;
    }

    async searchPatientInMPI(dni: string, sexo: string): Promise<AndesMPIPatient[]> {
        this.ensureConfigured();
        const response = await this.client.get<AndesMPIPatient[]>(this.mpiEndpoint, {
            params: { documento: dni, sexo, activo: true, estado: 'validado' },
        });
        return response.data;
    }

    async createPatientInMPI(patientData: Record<string, unknown>, ignoreSuggestions = false): Promise<AndesMPIPatient> {
        this.ensureConfigured();
        const response = await this.client.post<AndesMPIPatient>(this.mpiEndpoint, {
            ...patientData,
            ignoreSuggestions,
        });
        return response.data;
    }

    async getPatientFromMPI(id: string): Promise<AndesMPIPatient> {
        this.ensureConfigured();
        const response = await this.client.get<AndesMPIPatient>(`${this.mpiEndpoint}/${id}`);
        return response.data;
    }

    async updatePatientInMPI(id: string, data: Record<string, unknown>): Promise<void> {
        this.ensureConfigured();
        await this.client.patch(`${this.mpiEndpoint}/${id}`, data);
    }

    async listCoverages(): Promise<AndesCoverage[]> {
        this.ensureConfigured();
        const response = await this.client.get<AndesCoverage[]>('/modules/obraSocial/obrasSociales');
        return response.data;
    }

    async getPatientCoverage(dni: string, sexo: string): Promise<AndesCoverage | AndesCoverage[]> {
        this.ensureConfigured();
        const response = await this.client.get<AndesCoverage | AndesCoverage[]>('/modules/obraSocial/obraSocialPaciente', {
            params: { documento: dni, sexo },
        });
        return response.data;
    }

    async searchOrganizations(nombre: string): Promise<AndesOrganization[]> {
        this.ensureConfigured();
        const response = await this.client.get<AndesOrganization[]>('/core/tm/organizaciones', {
            params: { nombre, activo: true },
        });
        return response.data;
    }

    async searchSnomedConcepts(search: string): Promise<AndesSnomedConcept[]> {
        this.ensureConfigured();
        const expression = '<763158003:732943007=*,[0..0] 774159003=*, 763032000=*';
        const response = await this.client.get<AndesSnomedConcept[]>('/core/term/snomed', {
            params: { expression, search },
        });
        return response.data;
    }
}
