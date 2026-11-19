import { PrescriptionRepository } from '../prescriptions/prescription.repository';
import { Logger } from '../../shared/logger/logger.interface';
import { PraxysEventsRepository } from './praxys-events.repository';
import { PraxysEventsService } from './praxys-events.service';
import { PraxysEventsController } from './praxys-events.controller';

const defaultLogger: Logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const praxysEventsRepository = new PraxysEventsRepository();
const prescriptionRepository = new PrescriptionRepository();
const service = new PraxysEventsService(praxysEventsRepository, prescriptionRepository, defaultLogger);
const controller = new PraxysEventsController(service);

export { controller as praxysEventsController };
export { PraxysEventsController, PraxysEventsService, PraxysEventsRepository };
