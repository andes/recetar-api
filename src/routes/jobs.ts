import { Router } from 'express';
import JobsController from '../controllers/jobs.controller';

const router = Router();

// Programar email
router.post('/schedule-email', JobsController.scheduleEmail);

// Programar envio de recetas
router.post('/schedule-prescription', JobsController.programarEnvioRecetas);

// Obtener trabajos programados
router.get('/jobs', JobsController.getJobs);

// Cancelar trabajos
router.delete('/cancel-jobs', JobsController.cancelJobs);

// Programar trabajo personalizado
router.post('/schedule-custom', JobsController.scheduleCustomJob);

// Obtener estadísticas
router.get('/stats', JobsController.getJobStats);

export default router;
