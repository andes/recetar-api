import { Router } from 'express';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { stockController } from './index';

const router = Router();

const canReadStock = requirePermission('read:any', 'stock');

router.get('/', checkAuth, canReadStock, stockController.index);
router.get('/andes', checkAuth, canReadStock, stockController.getAndesStock);

export default router;
