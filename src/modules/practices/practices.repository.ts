import Practice from './practices.model';
import { IPractice } from './practices.types';
import { toObjectId } from '../../shared/utils/object-id';

export class PracticeRepository {
    async findAll(skip = 0, limit = 20): Promise<{ practices: IPractice[]; total: number }> {
        const [practices, total] = await Promise.all([
            Practice.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
            Practice.countDocuments({}).exec(),
        ]);
        return { practices, total };
    }

    async findById(id: string): Promise<IPractice | null> {
        return Practice.findById(id).exec();
    }

    async findByUserId(userId: string, skip = 0, limit = 20): Promise<{ practices: IPractice[]; total: number }> {
        const professionalId = toObjectId(userId);
        if (!professionalId) {
            return { practices: [], total: 0 };
        }
        const filter = { 'professional.userId': professionalId };
        const [practices, total] = await Promise.all([
            Practice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
            Practice.countDocuments(filter).exec(),
        ]);
        return { practices, total };
    }

    async searchByUserId(userId: string, searchTerm: string, skip = 0, limit = 20): Promise<{ practices: IPractice[]; total: number }> {
        const professionalId = toObjectId(userId);
        if (!professionalId) {
            return { practices: [], total: 0 };
        }
        const regex = new RegExp(searchTerm, 'i');
        const filter = {
            'professional.userId': professionalId,
            $or: [
                { 'patient.firstName': regex },
                { 'patient.lastName': regex },
                { 'patient.dni': regex },
            ],
        };
        const [practices, total] = await Promise.all([
            Practice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
            Practice.countDocuments(filter).exec(),
        ]);
        return { practices, total };
    }

    async findByUserIdAndPatientDni(userId: string, patientDni: string, limit = 10): Promise<IPractice[]> {
        const professionalId = toObjectId(userId);
        if (!professionalId) {
            return [];
        }
        return Practice.find({ 'professional.userId': professionalId, 'patient.dni': patientDni })
            .sort({ createdAt: -1 }).limit(limit).exec();
    }

    async create(data: Partial<IPractice>): Promise<IPractice> {
        return Practice.create(data);
    }

    async update(id: string, data: Partial<IPractice>): Promise<IPractice | null> {
        return Practice.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec() as unknown as IPractice | null;
    }

    async delete(id: string): Promise<IPractice | null> {
        return Practice.findByIdAndDelete(id).exec() as unknown as IPractice | null;
    }
}
