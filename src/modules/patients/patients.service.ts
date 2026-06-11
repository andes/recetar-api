import { PatientRepository } from './patients.repository';
import { AndesClient } from '../../integrations/andes';
import { AndesMapper } from '../../integrations/andes';
import type { ValidatedPatient } from '../../integrations/andes';
import { Logger } from '../../shared/logger/logger.interface';
import { IPatient } from './patients.types';
import { CreatePatientDTO, UpdatePatientDTO } from './patients.dto';
import { PatientNotFoundError, DuplicateDniError } from './patients.errors';
import { env } from '../../config/config';

export class PatientService {
    constructor(
        private readonly patientRepository: PatientRepository,
        private readonly andesClient: AndesClient,
        private readonly logger: Logger,
    ) {}

    async list(): Promise<IPatient[]> {
        return this.patientRepository.findAll();
    }

    async show(id: string): Promise<IPatient> {
        const patient = await this.patientRepository.findById(id);
        if (!patient) {
            throw new PatientNotFoundError();
        }
        return patient;
    }

    async search(term: string): Promise<IPatient[]> {
        return this.patientRepository.search(term);
    }

    async findByDni(dni: string): Promise<IPatient[]> {
        const patients = await this.patientRepository.findByDni(dni);
        if (patients.length > 0) {
            return patients;
        }
        try {
            const mpiPatients = await this.andesClient.searchPatientInMPI(dni, '');
            return mpiPatients.map((item) => AndesMapper.toLocalPatientFromMPI(item)) as unknown as IPatient[];
        } catch {
            return [];
        }
    }

    async create(dto: CreatePatientDTO): Promise<IPatient> {
        const existing = await this.patientRepository.findByDni(dto.dni);
        if (existing.length > 0) {
            throw new DuplicateDniError();
        }

        let validatedData: ValidatedPatient | null = null;
        let estado = 'temporal';
        let idMPI = '';

        if (env.PATIENT_VALIDATION_ENABLED) {
            try {
                validatedData = await this.andesClient.validatePatient(dto.dni, dto.sex);
                if (validatedData) {
                    estado = 'validado';
                    idMPI = validatedData.idMPI || '';
                }
            } catch (err) {
                this.logger.logWarn('Patient validation unavailable, creating as temporal', err);
            }
        }

        const data = {
            dni: dto.dni,
            firstName: validatedData ? validatedData.nombre : dto.firstName,
            lastName: validatedData ? validatedData.apellido : dto.lastName,
            sex: validatedData ? validatedData.sexo : dto.sex,
            fechaNac: validatedData?.fechaNacimiento
                ? new Date(validatedData.fechaNacimiento)
                : dto.fechaNac ? new Date(dto.fechaNac) : null,
            nombreAutopercibido: dto.nombreAutopercibido || '',
            genero: dto.genero || '',
            cuil: validatedData?.cuil || dto.cuil || null,
            estado,
            idMPI,
        };
        return this.patientRepository.create(data as unknown as Partial<IPatient>);
    }

    async update(id: string, dto: UpdatePatientDTO): Promise<IPatient> {
        const patient = await this.patientRepository.findById(id);
        if (!patient) {
            throw new PatientNotFoundError();
        }
        if (dto.dni && dto.dni !== patient.dni) {
            const existing = await this.patientRepository.findByDni(dto.dni);
            if (existing.length > 0 && existing[0]._id.toString() !== id) {
                throw new DuplicateDniError();
            }
        }

        let validatedData: ValidatedPatient | null = null;
        const targetDni = dto.dni || patient.dni || '';
        const targetSex = dto.sex || patient.sex || '';

        if (env.PATIENT_VALIDATION_ENABLED && targetDni && targetSex) {
            try {
                validatedData = await this.andesClient.validatePatient(targetDni, targetSex);
            } catch (err) {
                this.logger.logWarn('Patient validation unavailable during update', err);
            }
        }

        const data: Record<string, unknown> = { ...dto };
        if (validatedData) {
            data.firstName = validatedData.nombre;
            data.lastName = validatedData.apellido;
            data.sex = validatedData.sexo;
            data.fechaNac = validatedData.fechaNacimiento ? new Date(validatedData.fechaNacimiento) : undefined;
            data.cuil = validatedData.cuil || dto.cuil;
            data.estado = 'validado';
            data.idMPI = validatedData.idMPI;
            data.nombreAutopercibido = dto.nombreAutopercibido;
            data.genero = dto.genero;
        }
        if (data.fechaNac === undefined) {
            delete data.fechaNac;
        }

        const updated = await this.patientRepository.update(id, data as unknown as Partial<IPatient>);
        if (!updated) {
            throw new PatientNotFoundError();
        }
        return updated;
    }

    async updatePartial(id: string, body: Record<string, unknown>): Promise<IPatient> {
        const patient = await this.patientRepository.findById(id);
        if (!patient) {
            throw new PatientNotFoundError();
        }
        if (body['dni'] && body['dni'] !== patient.dni) {
            const existing = await this.patientRepository.findByDni(body['dni'] as string);
            if (existing.length > 0 && existing[0]._id.toString() !== id) {
                throw new DuplicateDniError();
            }
        }
        const values: Record<string, unknown> = {};
        const allowedFields = ['dni', 'lastName', 'firstName', 'sex'];
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                values[field] = body[field];
            }
        }
        const updated = await this.patientRepository.updatePartial(id, values);
        if (!updated) {
            throw new PatientNotFoundError();
        }
        return updated;
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
}
