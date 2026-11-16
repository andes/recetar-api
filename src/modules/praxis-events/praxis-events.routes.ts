import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.middleware';
import { praxisInboundGuard } from '../../shared/middlewares/praxis-inbound.middleware';
import { praxisEventsController } from './index';
import {
    praxisDispensationEventSchema,
    praxisHashParamSchema,
    praxisPrescriptionEventSchema,
} from './praxis-events.dto';

const router = Router();

router.use(praxisInboundGuard);

router.post(
    '/prescripciones',
    validate(praxisPrescriptionEventSchema),
    praxisEventsController.createPrescription,
);
router.delete(
    '/prescripciones/:hash',
    validate(praxisHashParamSchema, 'params'),
    praxisEventsController.annulPrescription,
);
router.delete(
    '/recetas/:hash',
    validate(praxisHashParamSchema, 'params'),
    praxisEventsController.annulReceta,
);
router.post(
    '/recetas/:hash/dispensa',
    validate(praxisHashParamSchema, 'params'),
    validate(praxisDispensationEventSchema),
    praxisEventsController.dispense,
);
router.delete(
    '/recetas/:hash/dispensa',
    validate(praxisHashParamSchema, 'params'),
    praxisEventsController.annulDispense,
);

export default router;
