import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { certificateController } from './index';
import {
    createCertificateSchema,
    updateCertificateSchema,
} from './certificates.dto';

const router = Router();

router.get('/', checkAuth, certificateController.index);
router.get('/:id', certificateController.show);
router.post('/', checkAuth, validate(createCertificateSchema), certificateController.create);
router.patch('/:id', checkAuth, validate(updateCertificateSchema), certificateController.update);
router.delete('/:id', checkAuth, certificateController.delete);

export default router;
