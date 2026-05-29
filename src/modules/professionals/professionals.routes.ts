import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { professionalController } from './index';
import { createProfessionalSchema, updateProfessionalSchema } from './professionals.dto';

const router = Router();

router.get('/', checkAuth, professionalController.index);
router.get('/dni/:dni', checkAuth, professionalController.findByDni);
router.get('/:id', checkAuth, professionalController.show);
router.post('/', checkAuth, validate(createProfessionalSchema), professionalController.create);
router.patch('/:id', checkAuth, validate(updateProfessionalSchema), professionalController.update);
router.delete('/:id', checkAuth, professionalController.delete);

export default router;
