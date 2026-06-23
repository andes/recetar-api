import { PracticeRepository } from './practices.repository';
import { PracticeService } from './practices.service';
import { PracticeController } from './practices.controller';
import { Logger, createLogger } from '@andes/log';

export function createPracticeModule(logger: Logger) {
    const repository = new PracticeRepository();
    const service = new PracticeService(repository, logger);
    const ctrl = new PracticeController(service);
    return ctrl;
}

const moduleLogger = createLogger('practices');

const controller = createPracticeModule(moduleLogger);

export { controller as practiceController };
export { PracticeController, PracticeService, PracticeRepository };
