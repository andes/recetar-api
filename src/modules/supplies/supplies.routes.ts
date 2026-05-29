import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { supplyController } from './index';
import { createSupplySchema, updateSupplySchema } from './supplies.dto';

const router = Router();

router.get('/', checkAuth, supplyController.index);
router.get('/snomed', checkAuth, supplyController.searchSnomed);
router.get('/:id', checkAuth, supplyController.show);
router.post('/', checkAuth, validate(createSupplySchema), supplyController.create);
router.patch('/:id', checkAuth, validate(updateSupplySchema), supplyController.update);
router.delete('/:id', checkAuth, supplyController.delete);

export default router;
