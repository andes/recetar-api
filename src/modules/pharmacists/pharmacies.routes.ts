import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { pharmacistController } from './index';
import {
    createPharmacySchema,
    updatePharmacySchema,
} from './pharmacists.dto';

const router = Router();

const canReadAnyUser = requirePermission('read:any', 'user');
const canReadOwnUser = requirePermission('read:own', 'user');
const canCreateUser = requirePermission('create:any', 'user');
const canUpdateAnyUser = requirePermission('update:any', 'user');
const canDeleteUser = requirePermission('delete:any', 'user');

router.get('/', checkAuth, canReadAnyUser, pharmacistController.indexPharmacies);
router.get('/:id', checkAuth, canReadOwnUser, pharmacistController.showPharmacy);
router.post('/', checkAuth, canCreateUser, validate(createPharmacySchema), pharmacistController.createPharmacy);
router.patch('/:id', checkAuth, canUpdateAnyUser, validate(updatePharmacySchema), pharmacistController.updatePharmacy);
router.delete('/:id', checkAuth, canDeleteUser, pharmacistController.deletePharmacy);

export default router;
