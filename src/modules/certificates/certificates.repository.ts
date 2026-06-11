import Certificate from './certificates.model';
import { ICertificate } from './certificates.types';
import { toObjectId } from '../../shared/utils/object-id';

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
        const professionalId = toObjectId(userId);
        if (!professionalId) {
            return { certificates: [], total: 0 };
        }
        const filter = { 'professional.userId': professionalId };
        const [certificates, total] = await Promise.all([
            Certificate.find(filter).sort({ startDate: -1 }).skip(skip).limit(limit).exec(),
            Certificate.countDocuments(filter).exec(),
        ]);
        return { certificates, total };
    }

    async searchByUserId(userId: string, searchTerm: string, skip = 0, limit = 20): Promise<{ certificates: ICertificate[]; total: number }> {
        const professionalId = toObjectId(userId);
        if (!professionalId) {
            return { certificates: [], total: 0 };
        }
        const regex = new RegExp(searchTerm, 'i');
        const filter = {
            'professional.userId': professionalId,
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

    async findByUserIdAndPatientDni(userId: string, patientDni: string, limit = 10): Promise<ICertificate[]> {
        const professionalId = toObjectId(userId);
        if (!professionalId) {
            return [];
        }
        return Certificate.find({ 'professional.userId': professionalId, 'patient.dni': patientDni })
            .sort({ createdAt: -1 }).limit(limit).exec();
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
