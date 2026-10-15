import { Router } from 'express';
import { checkAppAuth, requireAppPermission } from '../../shared/middlewares/app-auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { prescriptionController } from './index';
import { andesIngestSchema } from './ingest.dto';

const router = Router();

const canReadReceta = requireAppPermission('prescription:read');
const canUpdateReceta = requireAppPermission('prescription:update');
const canCreateReceta = requireAppPermission('prescription:create');

router.get('/motivos', checkAppAuth, canReadReceta, prescriptionController.recetasMotivos);
router.get('/filtros', checkAppAuth, canReadReceta, prescriptionController.recetasCompatibles);
router.get('/verificar', checkAppAuth, canReadReceta, prescriptionController.recetasVerificar);
router.get('/profesional/:id', checkAppAuth, canReadReceta, prescriptionController.recetasPorProfesional);
router.get('/por-prestacion/:id', checkAppAuth, canReadReceta, prescriptionController.recetasPorPrestacion);
router.get('/por-paciente/:dni', checkAppAuth, canReadReceta, prescriptionController.recetasPorPaciente);
router.get('/', checkAppAuth, canReadReceta, prescriptionController.recetasCompatibles);

router.post('/', checkAppAuth, canCreateReceta, validate(andesIngestSchema), prescriptionController.ingest);
router.patch('/', checkAppAuth, canUpdateReceta, prescriptionController.recetasPatch);

export default router;
