import { CertificateRepository } from './certificates.repository';
import { Logger } from '../../shared/logger/logger.interface';
import { ICertificate } from './certificates.types';
import { CreateCertificateDTO, UpdateCertificateDTO } from './certificates.dto';
import { CertificateNotFoundError } from './certificates.errors';

export class CertificateService {
    constructor(
        private readonly certificateRepository: CertificateRepository,
        private readonly logger: Logger,
    ) {}

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
        const data: Partial<ICertificate> = {
            ...dto as unknown as Partial<ICertificate>,
            startDate: new Date(dto.startDate),
        };
        return this.certificateRepository.create(data);
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
