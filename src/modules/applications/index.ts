import { ApplicationRepository } from './applications.repository';
import { ApplicationService } from './applications.service';
import { ApplicationController } from './applications.controller';
import { Logger } from '../../shared/logger/logger.interface';

const defaultLogger: Logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const repository = new ApplicationRepository();
const service = new ApplicationService(repository, defaultLogger);
const controller = new ApplicationController(service);

export { controller as applicationController };
export { ApplicationController, ApplicationService, ApplicationRepository };
export type { CreateApplicationDTO, IssueApplicationTokenDTO } from './applications.dto';
