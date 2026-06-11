import { AndesClient, AndesMapper } from '../../integrations/andes';
import type { AndesMPIPatient, ValidatedPatient } from '../../integrations/andes';
import { Logger } from '../../shared/logger/logger.interface';
import { IPatient } from './patients.types';
import { CreatePatientDTO, UpdatePatientDTO } from './patients.dto';
import {
    PatientNotFoundError,
    PatientValidationNotFoundError,
    PatientAndesUnavailableError,
} from './patients.errors';

export interface PatientSnapshot {
    firstName: string;
    lastName: string;
    dni: string;
    sex: string;
    fechaNac?: Date;
    idMPI?: string;
    [key: string]: unknown;
}

export class PatientService {
    constructor(
        private readonly andesClient: AndesClient,
        private readonly logger: Logger,
    ) {}

    async list(): Promise<IPatient[]> {
        return this.search('');
    }

    async show(id: string): Promise<IPatient> {
        try {
            const patient = await this.andesClient.getPatientFromMPI(id);
            if (!patient) {
                throw new PatientNotFoundError();
            }
            return this.toLocalPatient(patient);
        } catch (error) {
            if (error instanceof PatientNotFoundError) {
                throw error;
            }
            if (this.isNotFound(error)) {
                throw new PatientNotFoundError();
            }
            throw this.andesUnavailable(error);
        }
    }

    async search(term: string): Promise<IPatient[]> {
        const trimmed = term.trim();
        const params = trimmed ? { search: trimmed } : {};
        return (await this.searchInAndes(params)).map((patient) => this.toLocalPatient(patient));
    }

    async findByDni(dni: string): Promise<IPatient[]> {
        const patients = await this.searchInAndes({ documento: dni });
        return patients.map((patient) => this.toLocalPatient(patient));
    }

    async findByDniAndSex(dni: string, sex?: string): Promise<IPatient | null> {
        const normalizedSex = sex ? sex.toLowerCase() : '';
        const patients = await this.searchInAndes({
            documento: dni,
            ...(normalizedSex ? { sexo: normalizedSex } : {}),
        });
        if (patients.length === 0) {
            return null;
        }
        return this.toLocalPatient(patients[0]);
    }

    /**
     * Resuelve el paciente contra Andes y devuelve el snapshot a persistir
     * embebido en recetas, certificados y prácticas. Andes es la fuente de verdad.
     */
    async resolveSnapshot(dni: string, sex?: string): Promise<PatientSnapshot | null> {
        const patient = await this.findByDniAndSex(dni, sex);
        if (!patient) {
            return null;
        }
        return this.toSnapshot(patient);
    }

    async create(dto: CreatePatientDTO): Promise<IPatient> {
        const existing = await this.findByDniAndSex(dto.dni, dto.sex);
        if (existing) {
            return existing;
        }
        const byDni = await this.findByDni(dto.dni);
        if (byDni.length > 0) {
            return byDni[0];
        }

        const validated = await this.validateOrThrow(dto.dni, dto.sex);

        const payload = AndesMapper.toAndesValidatedPatient({
            ...validated,
            nombre: validated.nombre || dto.firstName || '',
            apellido: validated.apellido || dto.lastName || '',
        });

        let created;
        try {
            created = await this.andesClient.createPatientInMPI(payload as unknown as Record<string, unknown>, true);
        } catch (error) {
            throw this.andesUnavailable(error);
        }

        if (AndesMapper.isMPICreateSugeridos(created)) {
            const matches = await this.findByDni(dto.dni);
            if (matches.length > 0) {
                return matches[0];
            }
            throw new PatientValidationNotFoundError();
        }

        return this.toLocalPatient(created as AndesMPIPatient);
    }

    async update(id: string, dto: UpdatePatientDTO): Promise<IPatient> {
        await this.show(id);

        const data: Record<string, unknown> = { ...dto };
        if (dto.sex) {
            data.sexo = dto.sex.toLowerCase();
            data.genero = dto.sex.toLowerCase();
        }
        delete data.sex;

        try {
            const updated = await this.andesClient.updatePatientInMPI(id, data);
            return this.toLocalPatient(updated);
        } catch (error) {
            if (this.isNotFound(error)) {
                throw new PatientNotFoundError();
            }
            throw this.andesUnavailable(error);
        }
    }

    async updatePartial(id: string, body: Record<string, unknown>): Promise<IPatient> {
        const allowedFields = ['dni', 'lastName', 'firstName', 'sex'];
        const values: Record<string, unknown> = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                values[field] = body[field];
            }
        }
        return this.update(id, values as UpdatePatientDTO);
    }

    async getCoverages(): Promise<unknown> {
        return this.andesClient.listCoverages();
    }

    async getCoverage(dni: string, sexo: string): Promise<unknown> {
        return this.andesClient.getPatientCoverage(dni, sexo);
    }

    async searchCoverages(query: string): Promise<unknown> {
        return this.andesClient.searchCoverages(query);
    }

    async validateIdentity(dni: string, sexo: string): Promise<ValidatedPatient | null> {
        return this.andesClient.validatePatient(dni, sexo);
    }

    private async validateOrThrow(dni: string, sexo: string): Promise<ValidatedPatient> {
        let validated: ValidatedPatient | null;
        try {
            validated = await this.andesClient.validatePatient(dni, sexo);
        } catch (error) {
            throw this.andesUnavailable(error);
        }
        if (!validated) {
            throw new PatientValidationNotFoundError();
        }
        return validated;
    }

    private async searchInAndes(params: import('../../integrations/andes').AndesMPISearchParams): Promise<AndesMPIPatient[]> {
        try {
            return await this.andesClient.searchPatients(params);
        } catch (error) {
            throw this.andesUnavailable(error);
        }
    }

    private toLocalPatient(patient: AndesMPIPatient): IPatient {
        return AndesMapper.toLocalPatientFromMPI(patient) as unknown as IPatient;
    }

    private toSnapshot(patient: IPatient): PatientSnapshot {
        return {
            firstName: patient.firstName || '',
            lastName: patient.lastName || '',
            dni: patient.dni || '',
            sex: patient.sex || '',
            ...(patient.fechaNac ? { fechaNac: new Date(patient.fechaNac) } : {}),
            ...(patient.idMPI ? { idMPI: patient.idMPI } : {}),
        };
    }

    private isNotFound(error: unknown): boolean {
        const status = (error as { response?: { status?: number } })?.response?.status;
        return status === 404;
    }

    private andesUnavailable(error: unknown): PatientAndesUnavailableError {
        this.logger.logError(new Error(`ANDES MPI unavailable: ${(error as Error)?.message || 'unknown error'}`));
        return new PatientAndesUnavailableError();
    }
}
