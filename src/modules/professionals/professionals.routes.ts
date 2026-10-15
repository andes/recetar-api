import { Router } from 'express';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { professionalController } from './index';

const router = Router();

router.get('/me', checkAuth, professionalController.me);

export default router;
