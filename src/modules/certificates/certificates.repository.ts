import Certificate from './certificates.model';
import { ICertificate } from './certificates.types';

export class CertificateRepository {
    async findAll(skip = 0, limit = 20): Promise<{ certificates: ICertificate[]; total: number }> {
        const [certificates, total] = await Promise.all([
            Certificate.find().sort({ startDate: -1 }).skip(skip).limit(limit).exec(),
            Certificate.countDocuments({}).exec(),
        ]);
        return { certificates, total };
    }

    async findById(id: string): Promise<ICertificate | null> {
        return Certificate.findById(id).exec();
    }

    async findByUserId(userId: string, skip = 0, limit = 20): Promise<{ certificates: ICertificate[]; total: number }> {
        const filter = { 'professional.userId': userId };
        const [certificates, total] = await Promise.all([
            Certificate.find(filter).sort({ startDate: -1 }).skip(skip).limit(limit).exec(),
            Certificate.countDocuments(filter).exec(),
        ]);
        return { certificates, total };
    }

    async searchByUserId(userId: string, searchTerm: string, skip = 0, limit = 20): Promise<{ certificates: ICertificate[]; total: number }> {
        const regex = new RegExp(searchTerm, 'i');
        const filter = {
            'professional.userId': userId,
            $or: [
                { 'patient.firstName': regex },
                { 'patient.lastName': regex },
                { 'patient.dni': regex },
                { 'patient.nombreAutopercibido': regex },
            ],
        };
        const [certificates, total] = await Promise.all([
            Certificate.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
            Certificate.countDocuments(filter).exec(),
        ]);
        return { certificates, total };
    }

    async create(data: Partial<ICertificate>): Promise<ICertificate> {
        return Certificate.create(data);
    }

    async update(id: string, data: Partial<ICertificate>): Promise<ICertificate | null> {
        return Certificate.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
    }

    async delete(id: string): Promise<ICertificate | null> {
        return Certificate.findByIdAndDelete(id).exec();
    }
}
