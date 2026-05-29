import { PracticeRepository } from './practices.repository';
import { Logger } from '../../shared/logger/logger.interface';
import { IPractice } from './practices.types';
import { CreatePracticeDTO, UpdatePracticeDTO } from './practices.dto';
import { PracticeNotFoundError } from './practices.errors';

export class PracticeService {
    constructor(
        private readonly practiceRepository: PracticeRepository,
        private readonly logger: Logger,
    ) {}

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
        const data: Partial<IPractice> = {
            ...dto as unknown as Partial<IPractice>,
            date: new Date(dto.date),
        };
        return this.practiceRepository.create(data);
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
