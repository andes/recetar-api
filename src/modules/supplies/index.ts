import { SupplyRepository } from './supplies.repository';
import { SupplyService } from './supplies.service';
import { SupplyController } from './supplies.controller';
import { Logger } from '../../shared/logger/logger.interface';
import { AndesClient } from '../../integrations/andes';
import { env } from '../../config/config';

const logger: Logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const repository = new SupplyRepository();
const andesClient = new AndesClient({
    andesEndpoint: env.ANDES_ENDPOINT,
    jwtMpiToken: env.JWT_MPI_TOKEN,
    mpiEndpoint: env.ANDES_MPI_ENDPOINT,
});
const service = new SupplyService(repository, logger, andesClient);
const controller = new SupplyController(service);

export { controller as supplyController };
export { SupplyController, SupplyService, SupplyRepository };
