import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import patientsRoutes from '../modules/patients/patients.routes';
import professionalsRoutes from '../modules/professionals/professionals.routes';
import pharmacistsRoutes from '../modules/pharmacists/pharmacists.routes';
import pharmaciesRoutes from '../modules/pharmacists/pharmacies.routes';

import suppliesRoutes from '../modules/supplies/supplies.routes';
import practicesRoutes from '../modules/practices/practices.routes';
import certificatesRoutes from '../modules/certificates/certificates.routes';
import prescriptionsRoutes from '../modules/prescriptions/prescription.routes';
import stockRoutes from '../modules/stock/stock.routes';
import vademecumRoutes from './vademecum.routes';
import recentDocumentsRoutes from './recent-documents.routes';
import documentsRoutes from '../modules/documents/documents.routes';
import usersRoutes from '../modules/users/users.routes';
import securityRoutes from '../modules/security/security.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/users', securityRoutes);
router.use('/patients', patientsRoutes);
router.use('/professionals', professionalsRoutes);
router.use('/pharmacists', pharmacistsRoutes);
router.use('/pharmacies', pharmaciesRoutes);
router.use('/supplies', suppliesRoutes);
router.use('/practices', practicesRoutes);
router.use('/certificates', certificatesRoutes);
router.use('/prescriptions', prescriptionsRoutes);
router.use('/stock', stockRoutes);
router.use('/vademecum', vademecumRoutes);
router.use('/professionals', recentDocumentsRoutes);
router.use('/documents', documentsRoutes);

export default router;
