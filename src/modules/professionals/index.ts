import { ProfessionalRepository } from './professionals.repository';
import { ProfessionalService } from './professionals.service';
import { ProfessionalController } from './professionals.controller';
import { Logger, createLogger } from '@andes/log';

export const createProfessionalModule = (appLogger: Logger) => {
    const repo = new ProfessionalRepository();
    const svc = new ProfessionalService(repo, appLogger);
    const ctrl = new ProfessionalController(svc);
    return { controller: ctrl, service: svc, repository: repo };
};

const logger = createLogger('professionals');

const repository = new ProfessionalRepository();
const service = new ProfessionalService(repository, logger);
const controller = new ProfessionalController(service);

export { controller as professionalController };
export { ProfessionalController, ProfessionalService, ProfessionalRepository };
