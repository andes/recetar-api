import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { securityController } from './index';
import {
    setupSecurityPinSchema,
    changeSecurityPinSchema,
    disableSecurityPinSchema,
    verifyWebAuthnRegistrationSchema,
    verifyWebAuthnAssertionSchema,
} from './security.dto';

const router = Router();

router.get('/me/security-pin/status', checkAuth, securityController.getPinStatus);
router.post('/me/security-pin/setup', checkAuth, validate(setupSecurityPinSchema), securityController.setupPin);
router.patch('/me/security-pin', checkAuth, validate(changeSecurityPinSchema), securityController.changePin);
router.delete('/me/security-pin', checkAuth, validate(disableSecurityPinSchema), securityController.disablePin);

router.get('/me/webauthn/credentials', checkAuth, securityController.getWebAuthnCredentials);
router.post('/me/webauthn/register/options', checkAuth, securityController.getRegistrationOptions);
router.post('/me/webauthn/register/verify', checkAuth, validate(verifyWebAuthnRegistrationSchema), securityController.verifyRegistration);
router.post('/me/webauthn/authenticate/options', checkAuth, securityController.getAuthenticationOptions);
router.post('/me/webauthn/authenticate/verify', checkAuth, validate(verifyWebAuthnAssertionSchema), securityController.verifyAuthentication);
router.delete('/me/webauthn/credentials/:credentialId', checkAuth, securityController.deleteCredential);

export default router;
