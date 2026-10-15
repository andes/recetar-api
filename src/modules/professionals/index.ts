import { ProfessionalRepository } from './professionals.repository';
import { ProfessionalService } from './professionals.service';
import { ProfessionalController } from './professionals.controller';
import { AndesClient } from '../../integrations/andes';
import { UsersRepository } from '../users/users.repository';
import { Logger } from '../../shared/logger/logger.interface';
import { devLogger } from '../../shared/logger/dev-logger';
import { env } from '../../config/config';

export function createProfessionalService(
    andesClient?: AndesClient,
    logger: Logger = devLogger,
): ProfessionalService {
    const client = andesClient ?? new AndesClient({
        andesEndpoint: env.ANDES_ENDPOINT,
        jwtMpiToken: env.JWT_MPI_TOKEN,
        mpiEndpoint: env.ANDES_MPI_ENDPOINT,
    });
    return new ProfessionalService(
        new ProfessionalRepository(),
        new UsersRepository(),
        client,
        logger,
    );
}

const service = createProfessionalService();
const controller = new ProfessionalController(service);

export { controller as professionalController };
export { ProfessionalController, ProfessionalService, ProfessionalRepository };
