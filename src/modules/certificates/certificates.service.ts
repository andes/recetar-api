import { CertificateRepository } from './certificates.repository';
import { PatientService } from '../patients';
import type { PatientSnapshot } from '../patients';
import { Logger } from '../../shared/logger/logger.interface';
import { ICertificate } from './certificates.types';
import { CreateCertificateDTO, UpdateCertificateDTO } from './certificates.dto';
import { CertificateNotFoundError } from './certificates.errors';
import { PatientNotFoundError } from '../patients/patients.errors';

type PatientServiceProvider = PatientService | (() => PatientService);

export class CertificateService {
    constructor(
        private readonly certificateRepository: CertificateRepository,
        private readonly patientServiceProvider: PatientServiceProvider,
        private readonly logger: Logger,
    ) {}

    private get patientService(): PatientService {
        return typeof this.patientServiceProvider === 'function'
            ? this.patientServiceProvider()
            : this.patientServiceProvider;
    }

    async index(skip: number, limit: number): Promise<{ certificates: ICertificate[]; total: number }> {
        return this.certificateRepository.findAll(skip, limit);
    }

    async show(id: string): Promise<ICertificate> {
        const certificate = await this.certificateRepository.findById(id);
        if (!certificate) {
            throw new CertificateNotFoundError();
        }
        return certificate;
    }

    async getByUserId(userId: string, skip: number, limit: number): Promise<{ certificates: ICertificate[]; total: number }> {
        return this.certificateRepository.findByUserId(userId, skip, limit);
    }

    async searchByUserId(userId: string, searchTerm: string, skip: number, limit: number): Promise<{ certificates: ICertificate[]; total: number }> {
        return this.certificateRepository.searchByUserId(userId, searchTerm, skip, limit);
    }

    async create(dto: CreateCertificateDTO): Promise<ICertificate> {
        const snapshot = await this.resolvePatient(dto);
        const data: Partial<ICertificate> = {
            ...dto as unknown as Partial<ICertificate>,
            startDate: new Date(dto.startDate),
            patient: {
                ...dto.patient,
                ...snapshot,
                ...(snapshot.fechaNac ? { fechaNac: new Date(snapshot.fechaNac) } : {}),
                ...(dto.patient.fechaNac ? { fechaNac: new Date(dto.patient.fechaNac) } : {}),
            } as ICertificate['patient'],
        };
        return this.certificateRepository.create(data);
    }

    private async resolvePatient(dto: CreateCertificateDTO): Promise<PatientSnapshot> {
        const dni = dto.patient.dni;
        if (!dni) {
            return { idMPI: dto.patient.idMPI ?? undefined } as unknown as PatientSnapshot;
        }
        const snapshot = await this.patientService.resolveSnapshot(dni, dto.patient.sex);
        if (!snapshot) {
            throw new PatientNotFoundError();
        }
        return snapshot;
    }

    async update(id: string, dto: UpdateCertificateDTO): Promise<ICertificate> {
        const certificate = await this.certificateRepository.findById(id);
        if (!certificate) {
            throw new CertificateNotFoundError();
        }
        const data: Partial<ICertificate> = {
            ...dto as unknown as Partial<ICertificate>,
            ...(dto.anulateDate ? { anulateDate: new Date(dto.anulateDate) } : {}),
            status: 'anulado',
        };
        const updated = await this.certificateRepository.update(id, data);
        if (!updated) {
            throw new CertificateNotFoundError();
        }
        return updated;
    }

    async delete(id: string): Promise<void> {
        const certificate = await this.certificateRepository.findById(id);
        if (!certificate) {
            throw new CertificateNotFoundError();
        }
        await this.certificateRepository.delete(id);
    }
}
