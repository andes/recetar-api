import { PracticeRepository } from './practices.repository';
import { PracticeService } from './practices.service';
import { PracticeController } from './practices.controller';
import { createLogger } from '@andes/log';

export function createPracticeModule(logger: ReturnType<typeof createLogger>) {
    const repository = new PracticeRepository();
    const service = new PracticeService(repository, logger);
    const ctrl = new PracticeController(service);
    return ctrl;
}

const defaultLogger = createLogger('practices');

const controller = createPracticeModule(defaultLogger);

export { controller as practiceController };
export { PracticeController, PracticeService, PracticeRepository };
