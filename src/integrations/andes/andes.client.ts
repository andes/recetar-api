import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { TextDecoder } from 'util';
import { InternalError } from '../../shared/errors';
import { andesMessages } from './lang';
import { AndesMapper } from './andes.mapper';
import {
    AndesPrescription,
    AndesStockItem,
    AndesInsumoPayload,
    AndesSuspendPayload,
    AndesMPIPatient,
    AndesMPICreateResponse,
    AndesMPISearchParams,
    AndesCoverage,
    AndesOrganization,
    AndesSnomedConcept,
    ValidatedPatient,
    ValidationResponse,
    GetPrescriptionsByPatientParams,
    GetPrescriptionsByProfessionalParams,
    GetPrescriptionsByDniParams,
    AndesProfesionalDetalle,
    AndesFarmacia,
} from './andes.types';

export interface AndesClientConfig {
    andesEndpoint: string;
    jwtMpiToken: string;
    mpiEndpoint?: string;
}

const MPI_DEFAULT_PATH = '/core-v2/mpi/pacientes';
const MPI_DEFAULT_LIMIT = 50;
const REQUEST_TIMEOUT_MS = 20000;

export function decodeAndesResponse<T>(data: ArrayBuffer | Uint8Array): T {
    const bytes = data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

    let text: string;
    try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
        text = new TextDecoder('windows-1252').decode(bytes);
    }

    return normalizeAndesText(JSON.parse(text) as T);
}

export function normalizeAndesText<T>(value: T): T {
    if (typeof value === 'string') {
        return value.normalize('NFC') as T;
    }
    if (Array.isArray(value)) {
        return value.map((item) => normalizeAndesText(item)) as T;
    }
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        Object.keys(record).forEach((key) => {
            record[key] = normalizeAndesText(record[key]);
        });
    }
    return value;
}

export class AndesClient {
    private client: AxiosInstance;
    private configured: boolean;
    private mpiEndpoint: string;

    constructor(config?: AndesClientConfig) {
        const resolvedEndpoint = config?.andesEndpoint || '';
        const resolvedToken = config?.jwtMpiToken || '';
        this.mpiEndpoint = config?.mpiEndpoint || MPI_DEFAULT_PATH;

        this.configured = !!(resolvedEndpoint && resolvedToken);
        this.client = axios.create({
            baseURL: resolvedEndpoint,
            timeout: REQUEST_TIMEOUT_MS,
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

    private async requestMpi<T>(config: AxiosRequestConfig): Promise<T> {
        const response = await this.client.request({
            ...config,
            responseType: 'arraybuffer',
        });
        return decodeAndesResponse<T>(response.data);
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

    async getProfessionalByDocumento(documento: string): Promise<AndesProfesionalDetalle | null> {
        this.ensureConfigured();
        const response = await this.client.get<AndesProfesionalDetalle[]>('/core/tm/profesionales/guia', {
            params: { documento },
        });
        return Array.isArray(response.data) && response.data.length ? response.data[0] : null;
    }

    async getPharmacyByCuit(cuit: string): Promise<AndesFarmacia | null> {
        this.ensureConfigured();
        const response = await this.client.get<AndesFarmacia[]>('/core/tm/farmacias', {
            params: { cuit },
        });
        return Array.isArray(response.data) && response.data.length ? response.data[0] : null;
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

    async searchPatientInMPI(dni: string, sexo = ''): Promise<AndesMPIPatient[]> {
        return this.searchPatients({ documento: dni, sexo });
    }

    async searchPatients(params: AndesMPISearchParams): Promise<AndesMPIPatient[]> {
        this.ensureConfigured();
        const patients = await this.requestMpi<AndesMPIPatient[]>({
            method: 'GET',
            url: this.mpiEndpoint,
            params: {
                ...(params.documento ? { documento: params.documento } : {}),
                ...(params.search ? { search: params.search } : {}),
                ...(params.nombre ? { nombre: params.nombre } : {}),
                ...(params.apellido ? { apellido: params.apellido } : {}),
                ...(params.sexo ? { sexo: params.sexo } : {}),
                ...(params.estado ? { estado: params.estado } : {}),
                ...(params.email ? { email: params.email } : {}),
                ...(params.celular ? { celular: params.celular } : {}),
                ...(params.fijo ? { fijo: params.fijo } : {}),
                activo: params.activo ?? true,
                ...(params.skip ? { skip: params.skip } : {}),
                limit: params.limit ?? MPI_DEFAULT_LIMIT,
            },
        });
        return Array.isArray(patients) ? patients : [];
    }

    async createPatientInMPI(
        patientData: Record<string, unknown>,
        ignoreSuggestions = false,
    ): Promise<AndesMPICreateResponse> {
        this.ensureConfigured();
        return this.requestMpi<AndesMPICreateResponse>({
            method: 'POST',
            url: this.mpiEndpoint,
            data: {
                ...patientData,
                ignoreSuggestions,
            },
        });
    }

    async getPatientFromMPI(id: string): Promise<AndesMPIPatient> {
        this.ensureConfigured();
        return this.requestMpi<AndesMPIPatient>({
            method: 'GET',
            url: `${this.mpiEndpoint}/${id}`,
        });
    }

    async updatePatientInMPI(id: string, data: Record<string, unknown>): Promise<AndesMPIPatient> {
        this.ensureConfigured();
        return this.requestMpi<AndesMPIPatient>({
            method: 'PATCH',
            url: `${this.mpiEndpoint}/${id}`,
            data,
        });
    }

    async deletePatientInMPI(id: string): Promise<void> {
        this.ensureConfigured();
        await this.client.delete(`${this.mpiEndpoint}/${id}`);
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

    async searchCoverages(query: string): Promise<AndesCoverage[]> {
        this.ensureConfigured();
        const response = await this.client.get<AndesCoverage[]>('/modules/obraSocial/obrasSociales', {
            params: { nombre: query },
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

    async validatePatient(dni: string, sexo: string): Promise<ValidatedPatient | null> {
        this.ensureConfigured();
        const validation = await this.requestMpi<ValidationResponse>({
            method: 'POST',
            url: '/core-v2/mpi/validacion',
            data: {
                documento: dni,
                sexo: sexo.toLowerCase(),
            },
        });
        if (validation && validation.documento) {
            return AndesMapper.toValidatedPatientFromResponse(validation);
        }
        return null;
    }
}
