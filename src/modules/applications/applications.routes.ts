import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { checkAppAuth } from '../../shared/middlewares/app-auth.middleware';
import { applicationController } from './index';
import { createApplicationSchema, issueApplicationTokenSchema } from './applications.dto';

const router = Router();

const canCreateApplication = requirePermission('create:any', 'application');
const canUpdateApplication = requirePermission('update:any', 'application');

router.get('/me', checkAppAuth, applicationController.me);
router.post('/', checkAuth, canCreateApplication, validate(createApplicationSchema), applicationController.create);
router.post('/:id/token', checkAuth, canUpdateApplication, validate(issueApplicationTokenSchema), applicationController.issueToken);

export default router;
