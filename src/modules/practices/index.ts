import { PracticeRepository } from './practices.repository';
import { PracticeService } from './practices.service';
import { PracticeController } from './practices.controller';
import { Logger } from '../../shared/logger/logger.interface';
import { devLogger } from '../../shared/logger/dev-logger';
import { getPatientService } from '../patients';
import { createProfessionalService } from '../professionals';

export function createPracticeModule(logger: Logger) {
    const repository = new PracticeRepository();
    const professionalProfileService = createProfessionalService(undefined, logger);
    const service = new PracticeService(repository, getPatientService, logger, professionalProfileService);
    const ctrl = new PracticeController(service);
    return ctrl;
}

const controller = createPracticeModule(devLogger);

export { controller as practiceController };
export { PracticeController, PracticeService, PracticeRepository };
