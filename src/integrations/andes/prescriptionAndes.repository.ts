import PrescriptionAndes from './prescriptionAndes.model';
import { IPrescriptionAndes } from './prescriptionAndes.types';

export class PrescriptionAndesRepository {
    async findById(id: string): Promise<IPrescriptionAndes | null> {
        return PrescriptionAndes.findById(id).exec();
    }

    async findByIdAndes(idAndes: string): Promise<IPrescriptionAndes | null> {
        return PrescriptionAndes.findOne({ idAndes }).exec();
    }

    async findByProfessionalId(profesionalId: string, skip = 0, limit = 20): Promise<{ prescriptions: IPrescriptionAndes[]; total: number }> {
        const filter = { profesionalId };
        const [prescriptions, total] = await Promise.all([
            PrescriptionAndes.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
            PrescriptionAndes.countDocuments(filter).exec(),
        ]);
        return { prescriptions, total };
    }

    async findByDocumentAndConcept(
        documento: string,
        conceptId: string,
    ): Promise<IPrescriptionAndes[]> {
        return PrescriptionAndes.find({
            'paciente.documento': documento,
            'concepto.conceptId': conceptId,
            'estadoActual.tipo': { $in: ['vigente', 'pendiente'] },
            'estadoDispensaActual.tipo': { $nin: ['dispensada'] },
        }).exec();
    }

    async findByDocumento(documento: string): Promise<IPrescriptionAndes[]> {
        return PrescriptionAndes.find({ 'paciente.documento': documento }).exec();
    }

    async findByRecetaId(recetaId: string): Promise<IPrescriptionAndes | null> {
        return PrescriptionAndes.findOne({ 'dispensa.organizacion.id': recetaId }).exec();
    }

    async create(data: Partial<IPrescriptionAndes>): Promise<IPrescriptionAndes> {
        return PrescriptionAndes.create(data);
    }

    async delete(id: string): Promise<IPrescriptionAndes | null> {
        return PrescriptionAndes.findByIdAndDelete(id).exec();
    }

    async deleteByIdAndes(idAndes: string): Promise<unknown> {
        return PrescriptionAndes.deleteOne({ idAndes }).exec();
    }

    async countByProfessionalId(profesionalId: string): Promise<number> {
        return PrescriptionAndes.countDocuments({ profesionalId }).exec();
    }
}
