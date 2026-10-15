import Professional from './professionals.model';
import { IProfessional } from './professionals.types';

export class ProfessionalRepository {
    async findByUserId(userId: string): Promise<IProfessional | null> {
        return Professional.findOne({ userId }).exec();
    }

    async findByDocumento(documento: string): Promise<IProfessional | null> {
        return Professional.findOne({ documento }).exec();
    }

    async upsertByUserId(userId: string, data: Partial<IProfessional>): Promise<IProfessional | null> {
        return Professional.findOneAndUpdate(
            { userId },
            { $set: { ...data, actualizadoEn: new Date() }, $unset: { cuil: '' } },
            { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
        ).exec() as unknown as IProfessional | null;
    }

    async deleteByUserId(userId: string): Promise<void> {
        await Professional.deleteOne({ userId }).exec();
    }
}
