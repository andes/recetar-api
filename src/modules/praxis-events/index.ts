import { PrescriptionRepository } from '../prescriptions/prescription.repository';
import { Logger } from '../../shared/logger/logger.interface';
import { PraxisEventsRepository } from './praxis-events.repository';
import { PraxisEventsService } from './praxis-events.service';
import { PraxisEventsController } from './praxis-events.controller';

const defaultLogger: Logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const praxisEventsRepository = new PraxisEventsRepository();
const prescriptionRepository = new PrescriptionRepository();
const service = new PraxisEventsService(praxisEventsRepository, prescriptionRepository, defaultLogger);
const controller = new PraxisEventsController(service);

export { controller as praxisEventsController };
export { PraxisEventsController, PraxisEventsService, PraxisEventsRepository };
