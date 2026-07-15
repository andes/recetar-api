import { SupplyRepository } from './supplies.repository';
import { Logger } from '../../shared/logger/logger.interface';
import { ISupply } from './supplies.types';
import { CreateSupplyDTO, UpdateSupplyDTO } from './supplies.dto';
import { SupplyNotFoundError } from './supplies.errors';
import { AndesClient, AndesSnomedConcept } from '../../integrations/andes';

export class SupplyService {
    constructor(
        private readonly supplyRepository: SupplyRepository,
        private readonly logger: Logger,
        private readonly andesClient: AndesClient,
    ) {}

    async index(skip = 0, limit = 20): Promise<ISupply[]> {
        return this.supplyRepository.findAll(skip, limit);
    }

    async show(id: string): Promise<ISupply> {
        const supply = await this.supplyRepository.findById(id);
        if (!supply) {
            throw new SupplyNotFoundError();
        }
        return supply;
    }

    async search(name: string): Promise<ISupply[]> {
        return this.supplyRepository.findByName(name);
    }

    async create(dto: CreateSupplyDTO): Promise<ISupply> {
        return this.supplyRepository.create(dto as Partial<ISupply>);
    }

    async update(id: string, dto: UpdateSupplyDTO): Promise<ISupply> {
        const supply = await this.supplyRepository.findById(id);
        if (!supply) {
            throw new SupplyNotFoundError();
        }
        const updated = await this.supplyRepository.update(id, dto as Partial<ISupply>);
        if (!updated) {
            throw new SupplyNotFoundError();
        }
        return updated;
    }

    async delete(id: string): Promise<void> {
        const supply = await this.supplyRepository.findById(id);
        if (!supply) {
            throw new SupplyNotFoundError();
        }
        await this.supplyRepository.delete(id);
    }

    async searchSnomedConcepts(search: string, offset = 0, limit = 10): Promise<{ results: AndesSnomedConcept[]; total: number }> {
        const all = await this.andesClient.searchSnomedConcepts(search);
        const total = all.length;
        const results = all.slice(offset, offset + limit);
        return { results, total };
    }
}
