import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth } from '../shared/middlewares/auth.middleware';
import { PrescriptionRepository } from '../modules/prescriptions/prescription.repository';
import { CertificateRepository } from '../modules/certificates/certificates.repository';
import { PracticeRepository } from '../modules/practices/practices.repository';

const router = Router();
const prescriptionRepo = new PrescriptionRepository();
const certificateRepo = new CertificateRepository();
const practiceRepo = new PracticeRepository();

router.get('/:userId/patients/:patientDni/recent-documents', checkAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId, patientDni } = req.params;
        const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 50);

        const [prescriptions, certificates, practices] = await Promise.all([
            prescriptionRepo.findByUserIdAndPatientDni(userId, patientDni, limit),
            certificateRepo.findByUserIdAndPatientDni(userId, patientDni, limit),
            practiceRepo.findByUserIdAndPatientDni(userId, patientDni, limit),
        ]);

        res.status(200).json({
            status: 'success',
            data: { prescriptions, certificates, practices },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
