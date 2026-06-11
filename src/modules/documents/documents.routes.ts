import { Router, Request, Response, NextFunction } from 'express';
import Prescription from '../prescriptions/prescription.model';
import Certificate from '../certificates/certificates.model';
import Practice from '../practices/practices.model';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { toObjectId } from '../../shared/utils/object-id';

const router = Router();

router.get('/stats', checkAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const professionalId = toObjectId((req.user as any)._id);

        const [
            prescriptionTotal,
            prescriptionPendiente,
            prescriptionDispensada,
            prescriptionVencida,
            certificateTotal,
            certificateAnulados,
            practiceTotal,
            practiceActive,
            practiceCompleted,
            practiceCancelled,
            stockTotal,
        ] = await Promise.all([
            Prescription.countDocuments({ 'professional.userId': professionalId }),
            Prescription.countDocuments({ 'professional.userId': professionalId, status: 'Pendiente' }),
            Prescription.countDocuments({ 'professional.userId': professionalId, status: 'Dispensada' }),
            Prescription.countDocuments({ 'professional.userId': professionalId, status: 'Vencida' }),
            Certificate.countDocuments({ 'professional.userId': professionalId }),
            Certificate.countDocuments({ 'professional.userId': professionalId, anulateDate: { $exists: true } } as any),
            Practice.countDocuments({ 'professional.userId': professionalId }),
            Practice.countDocuments({ 'professional.userId': professionalId, status: 'active' }),
            Practice.countDocuments({ 'professional.userId': professionalId, status: 'completed' }),
            Practice.countDocuments({ 'professional.userId': professionalId, status: 'cancelled' }),
            Prescription.countDocuments({ 'supplies.supply.type': { $exists: true } }),
        ]);

        res.status(200).json({
            status: 'success',
            data: {
                totals: {
                    receta: prescriptionTotal,
                    certificados: certificateTotal,
                    practicas: practiceTotal,
                    insumos: stockTotal,
                },
                prescriptions: {
                    pendiente: prescriptionPendiente,
                    dispensada: prescriptionDispensada,
                    vencida: prescriptionVencida,
                },
                certificates: {
                    total: certificateTotal,
                    anulados: certificateAnulados,
                },
                practices: {
                    active: practiceActive,
                    completed: practiceCompleted,
                    cancelled: practiceCancelled,
                },
            },
        });
    } catch (err) {
        next(err);
    }
});

export default router;
