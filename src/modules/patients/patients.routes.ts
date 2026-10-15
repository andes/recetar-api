import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { patientController } from './index';
import {
    createPatientSchema,
    updatePatientSchema,
    searchPatientsSchema,
    getByDniSchema,
} from './patients.dto';

const router = Router();

const canReadPatient = requirePermission('read:any', 'patient');
const canCreatePatient = requirePermission('create:any', 'patient');
const canUpdatePatient = requirePermission('update:any', 'patient');
const canDeletePatient = requirePermission('delete:any', 'patient');

router.get('/', checkAuth, canReadPatient, patientController.list);
router.get('/coverages', checkAuth, canReadPatient, patientController.getCoverages);
router.get('/coverages/:dni', checkAuth, canReadPatient, patientController.getCoverage);
router.get('/search', checkAuth, canReadPatient, patientController.search);
router.get('/search-page', checkAuth, canReadPatient, validate(searchPatientsSchema, 'query'), patientController.searchPage);
router.get('/dni/:dni', checkAuth, canReadPatient, patientController.findByDni);
router.get('/:id', checkAuth, canReadPatient, patientController.show);
router.post('/', checkAuth, canCreatePatient, validate(createPatientSchema), patientController.create);
router.post('/validate', checkAuth, canReadPatient, patientController.validateIdentity);
router.post('/:id/validate', checkAuth, canUpdatePatient, patientController.validateById);
router.patch('/:id', checkAuth, canUpdatePatient, validate(updatePatientSchema), patientController.update);
router.delete('/:id', checkAuth, canDeletePatient, patientController.remove);

export default router;
