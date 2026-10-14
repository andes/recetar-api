import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { certificateController } from './index';
import {
    createCertificateSchema,
    updateCertificateSchema,
} from './certificates.dto';

const router = Router();

const canReadCertificate = requirePermission('read:any', 'certificate');
const canCreateCertificate = requirePermission('create:any', 'certificate');
const canUpdateCertificate = requirePermission('update:own', 'certificate');
const canDeleteCertificate = requirePermission('delete:any', 'certificate');

router.get('/', checkAuth, canReadCertificate, certificateController.index);
router.get('/:id', certificateController.show);
router.post('/', checkAuth, canCreateCertificate, validate(createCertificateSchema), certificateController.create);
router.patch('/:id', checkAuth, canUpdateCertificate, validate(updateCertificateSchema), certificateController.update);
router.delete('/:id', checkAuth, canDeleteCertificate, certificateController.delete);

export default router;
