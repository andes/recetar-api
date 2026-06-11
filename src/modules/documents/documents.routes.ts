import { Router, Request, Response, NextFunction } from 'express';
import Prescription from '../prescriptions/prescription.model';
import Certificate from '../certificates/certificates.model';
import Practice from '../practices/practices.model';
import { checkAuth } from '../../shared/middlewares/auth.middleware';

const router = Router();

router.get('/stats', checkAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req.user as any)._id;
        const userIdStr = userId.toString();

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
            Prescription.countDocuments({ 'professional.userId': userIdStr }),
            Prescription.countDocuments({ 'professional.userId': userIdStr, status: 'Pendiente' }),
            Prescription.countDocuments({ 'professional.userId': userIdStr, status: 'Dispensada' }),
            Prescription.countDocuments({ 'professional.userId': userIdStr, status: 'Vencida' }),
            Certificate.countDocuments({ 'professional.userId': userId }),
            Certificate.countDocuments({ 'professional.userId': userId, anulateDate: { $exists: true } } as any),
            Practice.countDocuments({ 'professional.userId': userIdStr }),
            Practice.countDocuments({ 'professional.userId': userIdStr, status: 'active' }),
            Practice.countDocuments({ 'professional.userId': userIdStr, status: 'completed' }),
            Practice.countDocuments({ 'professional.userId': userIdStr, status: 'cancelled' }),
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
