import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { pharmacistController } from './index';
import {
    createPharmacySchema,
    updatePharmacySchema,
} from './pharmacists.dto';

const router = Router();

router.get('/', checkAuth, pharmacistController.indexPharmacies);
router.get('/:id', checkAuth, pharmacistController.showPharmacy);
router.post('/', checkAuth, validate(createPharmacySchema), pharmacistController.createPharmacy);
router.patch('/:id', checkAuth, validate(updatePharmacySchema), pharmacistController.updatePharmacy);
router.delete('/:id', checkAuth, pharmacistController.deletePharmacy);

export default router;
