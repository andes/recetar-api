import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { professionalController } from './index';
import { createProfessionalSchema, updateProfessionalSchema } from './professionals.dto';

const router = Router();

const canReadAnyUser = requirePermission('read:any', 'user');
const canReadOwnUser = requirePermission('read:own', 'user');
const canCreateUser = requirePermission('create:any', 'user');
const canUpdateAnyUser = requirePermission('update:any', 'user');
const canDeleteUser = requirePermission('delete:any', 'user');

router.get('/', checkAuth, canReadAnyUser, professionalController.index);
router.get('/dni/:dni', checkAuth, canReadAnyUser, professionalController.findByDni);
router.get('/:id', checkAuth, canReadOwnUser, professionalController.show);
router.post('/', checkAuth, canCreateUser, validate(createProfessionalSchema), professionalController.create);
router.patch('/:id', checkAuth, canUpdateAnyUser, validate(updateProfessionalSchema), professionalController.update);
router.delete('/:id', checkAuth, canDeleteUser, professionalController.delete);

export default router;
