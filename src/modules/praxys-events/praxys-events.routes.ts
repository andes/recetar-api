import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { praxysInboundGuard } from '../../shared/middlewares/praxys-inbound.middleware';
import { praxysEventsController } from './index';
import {
    praxysDispensationEventSchema,
    praxysHashParamSchema,
    praxysPrescriptionEventSchema,
} from './praxys-events.dto';

const router = Router();

router.use(praxysInboundGuard);

router.post(
    '/prescripciones',
    validate(praxysPrescriptionEventSchema),
    praxysEventsController.createPrescription,
);
router.delete(
    '/prescripciones/:hash',
    validate(praxysHashParamSchema, 'params'),
    praxysEventsController.annulPrescription,
);
router.delete(
    '/recetas/:hash',
    validate(praxysHashParamSchema, 'params'),
    praxysEventsController.annulReceta,
);
router.post(
    '/recetas/:hash/dispensa',
    validate(praxysHashParamSchema, 'params'),
    validate(praxysDispensationEventSchema),
    praxysEventsController.dispense,
);
router.delete(
    '/recetas/:hash/dispensa',
    validate(praxysHashParamSchema, 'params'),
    praxysEventsController.annulDispense,
);

export default router;
