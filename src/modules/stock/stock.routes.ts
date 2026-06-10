import { Router } from 'express';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { stockController } from './index';

const router = Router();

router.get('/', checkAuth, stockController.index);
router.get('/andes', checkAuth, stockController.getAndesStock);

export default router;
