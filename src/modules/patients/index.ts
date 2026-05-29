import { PatientRepository } from './patients.repository';
import { PatientService } from './patients.service';
import { PatientController } from './patients.controller';
import { AndesClient } from '../../integrations/andes';
import { env } from '../../config/config';

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const repository = new PatientRepository();
const andesClient = new AndesClient({
    andesEndpoint: env.ANDES_ENDPOINT,
    jwtMpiToken: env.JWT_MPI_TOKEN,
    mpiEndpoint: env.ANDES_MPI_ENDPOINT,
});
const service = new PatientService(repository, andesClient, logger as any);
const controller = new PatientController(service);

export { controller as patientController };
export { PatientController, PatientService, PatientRepository };
