import { PracticeRepository } from './practices.repository';
import { PracticeService } from './practices.service';
import { PracticeController } from './practices.controller';
import { Logger } from '../../shared/logger/logger.interface';
import { getPatientService } from '../patients';

export function createPracticeModule(logger: Logger) {
    const repository = new PracticeRepository();
    const service = new PracticeService(repository, getPatientService, logger);
    const ctrl = new PracticeController(service);
    return ctrl;
}

const defaultLogger: Logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const controller = createPracticeModule(defaultLogger);

export { controller as practiceController };
export { PracticeController, PracticeService, PracticeRepository };
