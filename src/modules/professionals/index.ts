import { ProfessionalRepository } from './professionals.repository';
import { ProfessionalService } from './professionals.service';
import { ProfessionalController } from './professionals.controller';
import { Logger } from '../../shared/logger/logger.interface';

export const createProfessionalModule = (appLogger: Logger) => {
    const repo = new ProfessionalRepository();
    const svc = new ProfessionalService(repo, appLogger);
    const ctrl = new ProfessionalController(svc);
    return { controller: ctrl, service: svc, repository: repo };
};

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const repository = new ProfessionalRepository();
const service = new ProfessionalService(repository, logger as any);
const controller = new ProfessionalController(service);

export { controller as professionalController };
export { ProfessionalController, ProfessionalService, ProfessionalRepository };
