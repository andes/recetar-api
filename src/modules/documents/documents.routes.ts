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
            certificateTotal,
            practiceTotal,
            stockTotal,
        ] = await Promise.all([
            Prescription.countDocuments({ 'professional.userId': professionalId }),
            Certificate.countDocuments({ 'professional.userId': professionalId }),
            Practice.countDocuments({ 'professional.userId': professionalId }),
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
            },
        });
    } catch (err) {
        next(err);
    }
});

export default router;
