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
} from './users.dto';

const router = Router();

router.get('/', checkAuth, usersController.index);
router.get('/organizaciones-andes', checkAuth, usersController.organizacionesAndes);
router.post('/request-email-update', checkAuth, validate(requestEmailUpdateSchema), usersController.requestEmailUpdate);
router.post('/confirm-email-update', validate(confirmEmailUpdateSchema), usersController.confirmEmailUpdate);
router.patch('/me/organizaciones', checkAuth, validate(updateOwnOrganizacionesSchema), usersController.updateOwnOrganizaciones);
router.get('/:id', checkAuth, usersController.show);
router.post('/', checkAuth, validate(createUserSchema), usersController.create);
router.patch('/:id', checkAuth, validate(updateUserSchema), usersController.update);

export default router;
