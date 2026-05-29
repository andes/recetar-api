import { ProfessionalRepository } from './professionals.repository';
import { Logger } from '../../shared/logger/logger.interface';
import { IProfessional } from './professionals.types';
import { CreateProfessionalDTO, UpdateProfessionalDTO } from './professionals.dto';
import { ProfessionalNotFoundError } from './professionals.errors';

export class ProfessionalService {
    constructor(
        private readonly professionalRepository: ProfessionalRepository,
        private readonly logger: Logger,
    ) {}

    async index(skip: number, limit: number): Promise<IProfessional[]> {
        return this.professionalRepository.findAll(skip, limit);
    }

    async show(id: string): Promise<IProfessional> {
        const professional = await this.professionalRepository.findById(id);
        if (!professional) {
            throw new ProfessionalNotFoundError();
        }
        return professional;
    }

    async findByDni(dni: string): Promise<IProfessional[]> {
        return this.professionalRepository.findByDni(dni);
    }

    async create(dto: CreateProfessionalDTO): Promise<IProfessional> {
        return this.professionalRepository.create(dto as unknown as Partial<IProfessional>);
    }

    async update(id: string, dto: UpdateProfessionalDTO): Promise<IProfessional> {
        const professional = await this.professionalRepository.findById(id);
        if (!professional) {
            throw new ProfessionalNotFoundError();
        }
        const updated = await this.professionalRepository.update(id, dto as unknown as Partial<IProfessional>);
        if (!updated) {
            throw new ProfessionalNotFoundError();
        }
        return updated;
    }

    async delete(id: string): Promise<void> {
        const professional = await this.professionalRepository.findById(id);
        if (!professional) {
            throw new ProfessionalNotFoundError();
        }
        await this.professionalRepository.delete(id);
    }
}
