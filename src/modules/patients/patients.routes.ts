import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { patientController } from './index';
import {
    createPatientSchema,
    updatePatientSchema,
    getByDniSchema,
} from './patients.dto';

const router = Router();

const canReadPatient = requirePermission('read:any', 'patient');
const canCreatePatient = requirePermission('create:any', 'patient');
const canUpdatePatient = requirePermission('update:any', 'patient');

router.get('/', checkAuth, canReadPatient, patientController.list);
router.get('/coverages', checkAuth, canReadPatient, patientController.getCoverages);
router.get('/coverages/:dni', checkAuth, canReadPatient, patientController.getCoverage);
router.get('/search', checkAuth, canReadPatient, patientController.search);
router.get('/:id', checkAuth, canReadPatient, patientController.show);
router.get('/dni/:dni', checkAuth, canReadPatient, patientController.findByDni);
router.post('/', checkAuth, canCreatePatient, validate(createPatientSchema), patientController.create);
router.patch('/:id', checkAuth, canUpdatePatient, validate(updatePatientSchema), patientController.update);
router.post('/validate', checkAuth, canReadPatient, patientController.validateIdentity);

export default router;
