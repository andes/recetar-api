import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { supplyController } from './index';
import { createSupplySchema, updateSupplySchema } from './supplies.dto';

const router = Router();

const canReadSupplies = requirePermission('read:any', 'supplies');
const canCreateSupplies = requirePermission('create:any', 'supplies');
const canUpdateSupplies = requirePermission('update:any', 'supplies');
const canDeleteSupplies = requirePermission('delete:any', 'supplies');

router.get('/', checkAuth, canReadSupplies, supplyController.index);
router.get('/snomed', checkAuth, canReadSupplies, supplyController.searchSnomed);
router.get('/:id', checkAuth, canReadSupplies, supplyController.show);
router.post('/', checkAuth, canCreateSupplies, validate(createSupplySchema), supplyController.create);
router.patch('/:id', checkAuth, canUpdateSupplies, validate(updateSupplySchema), supplyController.update);
router.delete('/:id', checkAuth, canDeleteSupplies, supplyController.delete);

export default router;
