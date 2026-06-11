import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { authController } from './index';
import {
    loginSchema,
    registerSchema,
    refreshSchema,
    resetPasswordSchema,
    recoverPasswordSchema,
    setValidationTokenSchema,
    getTokenSchema,
    getMatriculasSchema,
} from './auth.dto';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);
router.post('/logout', validate(refreshSchema), authController.logout);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/reset-password', checkAuth, validate(resetPasswordSchema), authController.resetPassword);
router.post('/recovery-password', validate(recoverPasswordSchema), authController.recoverPassword);
router.post('/setValidationTokenAndNotify', validate(setValidationTokenSchema), authController.setValidationTokenAndNotify);
router.post('/get-token', validate(getTokenSchema), authController.getToken);
router.get('/jwt-login', checkAuth, authController.loginJwt);
router.get('/pharmacies-andes', authController.getPharmacyAndes);
router.get('/professionals-andes', authController.getProfessionalsAndes);
router.get(
    '/professionals-andes/matriculas',
    (req, _res, next) => {
        // eslint-disable-next-line no-console
        console.log('[matriculas] request recibido:', req.originalUrl, req.query);
        next();
    },
    checkAuth,
    validate(getMatriculasSchema, 'query'),
    authController.getMatriculas,
);
router.get('/authorizedProfessions', authController.getAuthorizedProfessions);
router.get('/role-types', checkAuth, authController.getRoleTypes);

export default router;
