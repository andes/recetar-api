import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { prescriptionController } from './index';
import {
    createPrescriptionSchema,
    updatePrescriptionSchema,
    dispensePrescriptionSchema,
} from './prescription.dto';
import {
    andesDispenseSchema,
    andesCancelDispenseSchema,
    andesSuspendSchema,
} from '../../integrations/andes';

const router = Router();

router.get('/user/:id', checkAuth, prescriptionController.getByUserId);
router.get('/find/:patientId', checkAuth, prescriptionController.findByPatient);
router.get('/dispensed-by/:cuil', checkAuth, prescriptionController.getDispensedByCuil);

router.get('/andes/verify', checkAuth, prescriptionController.verifyAndesReceta);
router.get('/andes/:id', checkAuth, prescriptionController.getAndesPrescription);
router.patch('/andes/dispense', checkAuth, validate(andesDispenseSchema), prescriptionController.andesDispense);
router.patch('/andes/cancel-dispense', checkAuth, validate(andesCancelDispenseSchema), prescriptionController.andesCancelDispense);
router.patch('/andes/suspend', checkAuth, validate(andesSuspendSchema), prescriptionController.andesSuspend);

router.get('/', checkAuth, prescriptionController.index);
router.get('/:id', checkAuth, prescriptionController.show);
router.post('/', checkAuth, validate(createPrescriptionSchema), prescriptionController.create);
router.patch('/:id', checkAuth, validate(updatePrescriptionSchema), prescriptionController.update);
router.patch('/:id/dispense', checkAuth, validate(dispensePrescriptionSchema), prescriptionController.dispense);
router.patch('/:id/cancel-dispense', checkAuth, prescriptionController.cancelDispense);
router.delete('/:id', checkAuth, prescriptionController.delete);

export default router;
