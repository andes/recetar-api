import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { practiceController } from './index';
import {
    createPracticeSchema,
    updatePracticeSchema,
} from './practices.dto';

const router = Router();

router.get('/', checkAuth, practiceController.index);
router.get('/:id', practiceController.show);
router.post('/', checkAuth, validate(createPracticeSchema), practiceController.create);
router.patch('/:id', checkAuth, validate(updatePracticeSchema), practiceController.update);
router.delete('/:id', checkAuth, practiceController.delete);

export default router;
