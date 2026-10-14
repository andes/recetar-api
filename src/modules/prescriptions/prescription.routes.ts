import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
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

const canReadPrescription = requirePermission('read:any', 'prescription');
const canCreatePrescription = requirePermission('create:any', 'prescription');
const canUpdateAnyPrescription = requirePermission('update:any', 'prescription');
const canUpdateOwnPrescription = requirePermission('update:own', 'prescription');
const canDeletePrescription = requirePermission('delete:any', 'prescription');

router.get('/user/:id', checkAuth, canReadPrescription, prescriptionController.getByUserId);
router.get('/find/:patientId', checkAuth, canReadPrescription, prescriptionController.findByPatient);
router.get('/dispensed-by/:cuil', checkAuth, canReadPrescription, prescriptionController.getDispensedByCuil);

router.get('/andes/verify', checkAuth, canReadPrescription, prescriptionController.verifyAndesReceta);
router.get('/andes/:id', checkAuth, canReadPrescription, prescriptionController.getAndesPrescription);
router.patch('/andes/dispense', checkAuth, canUpdateAnyPrescription, validate(andesDispenseSchema), prescriptionController.andesDispense);
router.patch('/andes/cancel-dispense', checkAuth, canUpdateAnyPrescription, validate(andesCancelDispenseSchema), prescriptionController.andesCancelDispense);
router.patch('/andes/suspend', checkAuth, canUpdateAnyPrescription, validate(andesSuspendSchema), prescriptionController.andesSuspend);

router.get('/', checkAuth, canReadPrescription, prescriptionController.index);
router.get('/:id', checkAuth, canReadPrescription, prescriptionController.show);
router.post('/', checkAuth, canCreatePrescription, validate(createPrescriptionSchema), prescriptionController.create);
router.patch('/:id', checkAuth, canUpdateOwnPrescription, validate(updatePrescriptionSchema), prescriptionController.update);
router.patch('/:id/dispense', checkAuth, canUpdateAnyPrescription, validate(dispensePrescriptionSchema), prescriptionController.dispense);
router.patch('/:id/cancel-dispense', checkAuth, canUpdateAnyPrescription, prescriptionController.cancelDispense);
router.delete('/:id', checkAuth, canDeletePrescription, prescriptionController.delete);

export default router;
