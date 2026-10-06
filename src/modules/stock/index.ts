import { StockRepository } from './stock.repository';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { AndesClient } from '../../integrations/andes';
import { createLogger } from '@andes/log';
import { env } from '../../config/config';

const defaultLogger = createLogger('stock');

const repository = new StockRepository();
const andesClient = new AndesClient({
    andesEndpoint: env.ANDES_ENDPOINT,
    jwtMpiToken: env.JWT_MPI_TOKEN,
    mpiEndpoint: env.ANDES_MPI_ENDPOINT,
});
const service = new StockService(repository, andesClient, defaultLogger);
const controller = new StockController(service);

export { controller as stockController };
export { StockController, StockService, StockRepository };
