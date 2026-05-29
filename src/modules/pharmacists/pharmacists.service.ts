import { PharmacistRepository } from './pharmacists.repository';
import { Logger } from '../../shared/logger/logger.interface';
import { IPharmacist, IPharmacy } from './pharmacists.types';
import { CreatePharmacistDTO, UpdatePharmacistDTO, CreatePharmacyDTO, UpdatePharmacyDTO } from './pharmacists.dto';
import { PharmacistNotFoundError, PharmacyNotFoundError } from './pharmacists.errors';

export class PharmacistService {
    constructor(
        private readonly pharmacistRepository: PharmacistRepository,
        private readonly logger: Logger,
    ) {}

    async index(): Promise<IPharmacist[]> {
        return this.pharmacistRepository.findAll();
    }

    async show(id: string): Promise<IPharmacist> {
        const pharmacist = await this.pharmacistRepository.findById(id);
        if (!pharmacist) {
            throw new PharmacistNotFoundError();
        }
        return pharmacist;
    }

    async create(dto: CreatePharmacistDTO): Promise<IPharmacist> {
        return this.pharmacistRepository.create(dto as unknown as Partial<IPharmacist>);
    }

    async update(id: string, dto: UpdatePharmacistDTO): Promise<IPharmacist> {
        const pharmacist = await this.pharmacistRepository.findById(id);
        if (!pharmacist) {
            throw new PharmacistNotFoundError();
        }
        const updated = await this.pharmacistRepository.update(id, dto as unknown as Partial<IPharmacist>);
        if (!updated) {
            throw new PharmacistNotFoundError();
        }
        return updated;
    }

    async delete(id: string): Promise<void> {
        const pharmacist = await this.pharmacistRepository.findById(id);
        if (!pharmacist) {
            throw new PharmacistNotFoundError();
        }
        await this.pharmacistRepository.delete(id);
    }

    async indexPharmacies(): Promise<IPharmacy[]> {
        return this.pharmacistRepository.findAllPharmacies();
    }

    async showPharmacy(id: string): Promise<IPharmacy> {
        const pharmacy = await this.pharmacistRepository.findPharmacyById(id);
        if (!pharmacy) {
            throw new PharmacyNotFoundError();
        }
        return pharmacy;
    }

    async createPharmacy(dto: CreatePharmacyDTO): Promise<IPharmacy> {
        const pharmacist = await this.pharmacistRepository.findById(dto.pharmacist);
        if (!pharmacist) {
            throw new PharmacistNotFoundError();
        }
        return this.pharmacistRepository.createPharmacy(dto as unknown as Partial<IPharmacy>);
    }

    async updatePharmacy(id: string, dto: UpdatePharmacyDTO): Promise<IPharmacy> {
        const pharmacy = await this.pharmacistRepository.findPharmacyById(id);
        if (!pharmacy) {
            throw new PharmacyNotFoundError();
        }
        if (dto.pharmacist) {
            const pharmacist = await this.pharmacistRepository.findById(dto.pharmacist);
            if (!pharmacist) {
                throw new PharmacistNotFoundError();
            }
        }
        const updated = await this.pharmacistRepository.updatePharmacy(id, dto as unknown as Partial<IPharmacy>);
        if (!updated) {
            throw new PharmacyNotFoundError();
        }
        return updated;
    }

    async deletePharmacy(id: string): Promise<void> {
        const pharmacy = await this.pharmacistRepository.findPharmacyById(id);
        if (!pharmacy) {
            throw new PharmacyNotFoundError();
        }
        await this.pharmacistRepository.deletePharmacy(id);
    }
}
