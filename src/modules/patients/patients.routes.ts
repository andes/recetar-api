import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { patientController } from './index';
import {
    createPatientSchema,
    updatePatientSchema,
    getByDniSchema,
} from './patients.dto';

const router = Router();

router.get('/', checkAuth, patientController.list);
router.get('/coverages', checkAuth, patientController.getCoverages);
router.get('/coverages/:dni', checkAuth, patientController.getCoverage);
router.get('/search', checkAuth, patientController.search);
router.get('/dni/:dni', checkAuth, validate(getByDniSchema, 'params'), patientController.findByDni);
router.post('/', checkAuth, validate(createPatientSchema), patientController.create);
router.post('/validate', checkAuth, patientController.validateIdentity);
router.get('/:id', checkAuth, patientController.show);
router.patch('/:id', checkAuth, validate(updatePatientSchema), patientController.update);

export default router;
