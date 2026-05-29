import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { patientController } from './index';
import {
    createPatientSchema,
    updatePatientSchema,
} from './patients.dto';

const router = Router();

router.get('/', checkAuth, patientController.list);
router.get('/coverages', checkAuth, patientController.getCoverages);
router.get('/coverages/:dni', checkAuth, patientController.getCoverage);
router.get('/:id', checkAuth, patientController.show);
router.get('/dni/:dni', checkAuth, patientController.findByDni);
router.post('/', checkAuth, validate(createPatientSchema), patientController.create);
router.patch('/:id', checkAuth, validate(updatePatientSchema), patientController.update);
router.patch('/:id', checkAuth, patientController.updatePartial);

export default router;
