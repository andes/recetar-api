import { PrescriptionRepository } from './prescription.repository';
import { PrescriptionService } from './prescription.service';
import { PrescriptionController } from './prescription.controller';
import { AndesClient, PrescriptionAndesRepository } from '../../integrations/andes';
import { Logger } from '../../shared/logger/logger.interface';
import { env } from '../../config/config';

const defaultLogger: Logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const prescriptionRepository = new PrescriptionRepository();
const prescriptionAndesRepository = new PrescriptionAndesRepository();
const andesClient = new AndesClient({
    andesEndpoint: env.ANDES_ENDPOINT,
    jwtMpiToken: env.JWT_MPI_TOKEN,
    mpiEndpoint: env.ANDES_MPI_ENDPOINT,
});
const service = new PrescriptionService(
    prescriptionRepository,
    prescriptionAndesRepository,
    andesClient,
    defaultLogger,
);
const controller = new PrescriptionController(service);

export { controller as prescriptionController };
export { PrescriptionController, PrescriptionService, PrescriptionRepository };
