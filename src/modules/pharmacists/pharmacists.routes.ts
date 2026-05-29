import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { pharmacistController } from './index';
import {
    createPharmacistSchema,
    updatePharmacistSchema,
} from './pharmacists.dto';

const router = Router();

router.get('/', checkAuth, pharmacistController.index);
router.get('/:id', checkAuth, pharmacistController.show);
router.post('/', checkAuth, validate(createPharmacistSchema), pharmacistController.create);
router.patch('/:id', checkAuth, validate(updatePharmacistSchema), pharmacistController.update);
router.delete('/:id', checkAuth, pharmacistController.delete);

export default router;
