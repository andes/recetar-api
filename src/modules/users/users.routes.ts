import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
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

router.get('/', checkAuth, usersController.index);
router.get('/organizaciones-andes', checkAuth, usersController.organizacionesAndes);
router.get('/organizations-sisa', checkAuth, usersController.organizationsSisa);
router.get('/organizations-sisa/:codigo', checkAuth, usersController.organizationSisaDetail);
router.post('/request-email-update', checkAuth, validate(requestEmailUpdateSchema), usersController.requestEmailUpdate);
router.post('/confirm-email-update', validate(confirmEmailUpdateSchema), usersController.confirmEmailUpdate);
router.patch('/me/organizaciones', checkAuth, validate(updateOwnOrganizacionesSchema), usersController.updateOwnOrganizaciones);
router.post('/me/organizaciones/sisa', checkAuth, validate(addSisaOrganizacionSchema), usersController.addSisaOrganizacion);
router.get('/:id', checkAuth, usersController.show);
router.post('/', checkAuth, validate(createUserSchema), usersController.create);
router.patch('/:id', checkAuth, validate(updateUserSchema), usersController.update);

export default router;
