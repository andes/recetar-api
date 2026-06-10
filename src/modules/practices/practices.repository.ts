import Practice from './practices.model';
import { IPractice } from './practices.types';

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
        const filter = { 'professional.userId': userId };
        const [practices, total] = await Promise.all([
            Practice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
            Practice.countDocuments(filter).exec(),
        ]);
        return { practices, total };
    }

    async searchByUserId(userId: string, searchTerm: string, skip = 0, limit = 20): Promise<{ practices: IPractice[]; total: number }> {
        const regex = new RegExp(searchTerm, 'i');
        const filter = {
            'professional.userId': userId,
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
