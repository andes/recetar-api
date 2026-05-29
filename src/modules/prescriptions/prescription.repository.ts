import Prescription from './prescription.model';
import { IPrescription } from './prescription.types';

export class PrescriptionRepository {
    async findAll(skip = 0, limit = 20): Promise<{ prescriptions: IPrescription[]; total: number }> {
        const [prescriptions, total] = await Promise.all([
            Prescription.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
            Prescription.countDocuments({}).exec(),
        ]);
        return { prescriptions, total };
    }

    async findById(id: string): Promise<IPrescription | null> {
        return Prescription.findById(id).exec();
    }

    async findByUserId(userId: string, skip = 0, limit = 20): Promise<{ prescriptions: IPrescription[]; total: number }> {
        const filter = { 'professional.userId': userId };
        const [prescriptions, total] = await Promise.all([
            Prescription.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
            Prescription.countDocuments(filter).exec(),
        ]);
        return { prescriptions, total };
    }

    async searchByUserId(userId: string, searchTerm: string, skip = 0, limit = 20): Promise<{ prescriptions: IPrescription[]; total: number }> {
        const regex = new RegExp(searchTerm, 'i');
        const filter = {
            'professional.userId': userId,
            $or: [
                { 'patient.firstName': regex },
                { 'patient.lastName': regex },
                { 'patient.dni': regex },
            ],
        };
        const [prescriptions, total] = await Promise.all([
            Prescription.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
            Prescription.countDocuments(filter).exec(),
        ]);
        return { prescriptions, total };
    }

    async findByPatientDni(dni: string, skip = 0, limit = 20): Promise<{ prescriptions: IPrescription[]; total: number }> {
        const filter = { 'patient.dni': dni };
        const [prescriptions, total] = await Promise.all([
            Prescription.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
            Prescription.countDocuments(filter).exec(),
        ]);
        return { prescriptions, total };
    }

    async findByPatientDniAndDateRange(
        dni: string,
        startDate?: string,
        endDate?: string,
        status?: string,
        skip = 0,
        limit = 20,
    ): Promise<{ prescriptions: IPrescription[]; total: number }> {
        const filter: Record<string, unknown> = { 'patient.dni': dni };
        if (status) { filter.status = status; }
        if (startDate || endDate) {
            const dateFilter: Record<string, Date> = {};
            if (startDate) { dateFilter.$gte = new Date(startDate); }
            if (endDate) { dateFilter.$lte = new Date(endDate); }
            filter.date = dateFilter;
        }
        const [prescriptions, total] = await Promise.all([
            Prescription.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
            Prescription.countDocuments(filter).exec(),
        ]);
        return { prescriptions, total };
    }

    async findByDispensedByCuil(cuil: string, skip = 0, limit = 20): Promise<{ prescriptions: IPrescription[]; total: number }> {
        const filter = { 'dispensedBy.cuil': cuil };
        const [prescriptions, total] = await Promise.all([
            Prescription.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
            Prescription.countDocuments(filter).exec(),
        ]);
        return { prescriptions, total };
    }

    async create(data: Partial<IPrescription>): Promise<IPrescription> {
        return Prescription.create(data);
    }

    async update(id: string, data: Partial<IPrescription>): Promise<IPrescription | null> {
        return Prescription.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
    }

    async delete(id: string): Promise<IPrescription | null> {
        return Prescription.findByIdAndDelete(id).exec();
    }

    async expireOldPrescriptions(): Promise<number> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const result = await Prescription.updateMany(
            { status: 'Pendiente', date: { $lt: thirtyDaysAgo } },
            { $set: { status: 'Vencida' } },
        ).exec();
        return (result as any).nModified || (result as any).modifiedCount || 0;
    }

    async findByStatusAndAmbito(status: string, ambito: string, limit = 100): Promise<IPrescription[]> {
        return Prescription.find({ status, ambito }).limit(limit).exec();
    }
}
