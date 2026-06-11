import { PracticeRepository } from './practices.repository';
import { PatientService } from '../patients';
import type { PatientSnapshot } from '../patients';
import { Logger } from '../../shared/logger/logger.interface';
import { IPractice } from './practices.types';
import { CreatePracticeDTO, UpdatePracticeDTO } from './practices.dto';
import { PracticeNotFoundError } from './practices.errors';
import { PatientNotFoundError } from '../patients/patients.errors';

type PatientServiceProvider = PatientService | (() => PatientService);

export class PracticeService {
    constructor(
        private readonly practiceRepository: PracticeRepository,
        private readonly patientServiceProvider: PatientServiceProvider,
        private readonly logger: Logger,
    ) {}

    private get patientService(): PatientService {
        return typeof this.patientServiceProvider === 'function'
            ? this.patientServiceProvider()
            : this.patientServiceProvider;
    }

    async index(skip: number, limit: number): Promise<{ practices: IPractice[]; total: number }> {
        return this.practiceRepository.findAll(skip, limit);
    }

    async show(id: string): Promise<IPractice> {
        const practice = await this.practiceRepository.findById(id);
        if (!practice) {
            throw new PracticeNotFoundError();
        }
        return practice;
    }

    async create(dto: CreatePracticeDTO): Promise<IPractice> {
        const snapshot = await this.resolvePatient(dto.patient.dni, dto.patient.sex);
        const data: Partial<IPractice> = {
            ...dto as unknown as Partial<IPractice>,
            patient: { ...dto.patient, ...snapshot },
            date: new Date(dto.date),
        };
        return this.practiceRepository.create(data);
    }

    private async resolvePatient(dni: string, sex: string): Promise<PatientSnapshot> {
        const snapshot = await this.patientService.resolveSnapshot(dni, sex);
        if (!snapshot) {
            throw new PatientNotFoundError();
        }
        return snapshot;
    }

    async update(id: string, dto: UpdatePracticeDTO): Promise<IPractice> {
        const practice = await this.practiceRepository.findById(id);
        if (!practice) {
            throw new PracticeNotFoundError();
        }
        const data: Partial<IPractice> = {
            ...dto as unknown as Partial<IPractice>,
            ...(dto.date ? { date: new Date(dto.date) } : {}),
        };
        const updated = await this.practiceRepository.update(id, data);
        if (!updated) {
            throw new PracticeNotFoundError();
        }
        return updated;
    }

    async delete(id: string): Promise<void> {
        const practice = await this.practiceRepository.findById(id);
        if (!practice) {
            throw new PracticeNotFoundError();
        }
        await this.practiceRepository.delete(id);
    }

    async getByUserId(userId: string, skip: number, limit: number): Promise<{ practices: IPractice[]; total: number }> {
        return this.practiceRepository.findByUserId(userId, skip, limit);
    }

    async searchByUserId(userId: string, searchTerm: string, skip: number, limit: number): Promise<{ practices: IPractice[]; total: number }> {
        return this.practiceRepository.searchByUserId(userId, searchTerm, skip, limit);
    }
}
