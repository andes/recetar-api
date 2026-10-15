import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { usersController } from './index';
import {
    createUserSchema,
    updateUserSchema,
    requestEmailUpdateSchema,
    confirmEmailUpdateSchema,
    updateOwnOrganizacionesSchema,
    addSisaOrganizacionSchema,
} from './users.dto';

const router = Router();

const canReadAnyUser = requirePermission('read:any', 'user');
const canReadOwnUser = requirePermission('read:own', 'user');
const canCreateUser = requirePermission('create:any', 'user');
const canUpdateAnyUser = requirePermission('update:any', 'user');
const canUpdateOwnUser = requirePermission('update:own', 'user');

router.get('/', checkAuth, canReadAnyUser, usersController.index);
router.get('/organizaciones-andes', checkAuth, canReadOwnUser, usersController.organizacionesAndes);
router.get('/organizations-sisa', checkAuth, canReadOwnUser, usersController.organizationsSisa);
router.get('/organizations-sisa/:codigo', checkAuth, canReadOwnUser, usersController.organizationSisaDetail);
router.post('/request-email-update', checkAuth, canUpdateOwnUser, validate(requestEmailUpdateSchema), usersController.requestEmailUpdate);
router.post('/confirm-email-update', validate(confirmEmailUpdateSchema), usersController.confirmEmailUpdate);
router.patch('/me/organizaciones', checkAuth, canUpdateOwnUser, validate(updateOwnOrganizacionesSchema), usersController.updateOwnOrganizaciones);
router.post('/me/organizaciones/sisa', checkAuth, canUpdateOwnUser, validate(addSisaOrganizacionSchema), usersController.addSisaOrganizacion);
router.get('/:id', checkAuth, canReadOwnUser, usersController.show);
router.post('/', checkAuth, canCreateUser, validate(createUserSchema), usersController.create);
router.patch('/:id', checkAuth, canUpdateAnyUser, validate(updateUserSchema), usersController.update);
router.delete('/:id', checkAuth, canUpdateAnyUser, usersController.remove);

export default router;
