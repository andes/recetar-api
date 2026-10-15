import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { practiceController } from './index';
import {
    createPracticeSchema,
    updatePracticeSchema,
} from './practices.dto';

const router = Router();

const canReadPractice = requirePermission('read:any', 'practice');
const canCreatePractice = requirePermission('create:any', 'practice');
const canUpdatePractice = requirePermission('update:own', 'practice');
const canDeletePractice = requirePermission('delete:any', 'practice');

router.get('/', checkAuth, canReadPractice, practiceController.index);
router.get('/:id', practiceController.show);
router.post('/', checkAuth, canCreatePractice, validate(createPracticeSchema), practiceController.create);
router.patch('/:id', checkAuth, canUpdatePractice, validate(updatePracticeSchema), practiceController.update);
router.delete('/:id', checkAuth, canDeletePractice, practiceController.delete);

export default router;
