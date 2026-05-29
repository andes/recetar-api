import { PharmacistRepository } from './pharmacists.repository';
import { PharmacistService } from './pharmacists.service';
import { PharmacistController } from './pharmacists.controller';
import { Logger } from '../../shared/logger/logger.interface';

const defaultLogger: Logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const repository = new PharmacistRepository();
const service = new PharmacistService(repository, defaultLogger);
const controller = new PharmacistController(service);

export { controller as pharmacistController };
export { PharmacistController, PharmacistService, PharmacistRepository };
