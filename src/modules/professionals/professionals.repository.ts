import Professional from './professionals.model';
import { IProfessional } from './professionals.types';

export class ProfessionalRepository {
    async findAll(skip: number, limit: number): Promise<IProfessional[]> {
        return Professional.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec();
    }

    async findById(id: string): Promise<IProfessional | null> {
        return Professional.findById(id).exec();
    }

    async findByEnrollment(enrollment: string): Promise<IProfessional | null> {
        return Professional.findOne({ enrollment }).exec();
    }

    async findByDni(dni: string): Promise<IProfessional[]> {
        return Professional.find({ dni }).exec();
    }

    async create(data: Partial<IProfessional>): Promise<IProfessional> {
        return Professional.create(data);
    }

    async update(id: string, data: Partial<IProfessional>): Promise<IProfessional | null> {
        return Professional.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec() as unknown as IProfessional | null;
    }

    async delete(id: string): Promise<IProfessional | null> {
        return Professional.findByIdAndDelete(id).exec();
    }
}
