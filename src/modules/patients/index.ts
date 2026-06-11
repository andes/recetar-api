import { PatientService } from './patients.service';
import { PatientController } from './patients.controller';
import { AndesClient } from '../../integrations/andes';
import { env } from '../../config/config';

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const andesClient = new AndesClient({
    andesEndpoint: env.ANDES_ENDPOINT,
    jwtMpiToken: env.JWT_MPI_TOKEN,
    mpiEndpoint: env.ANDES_MPI_ENDPOINT,
});
let service = new PatientService(andesClient, logger as any);
let controller = new PatientController(service);

export function setPatientService(override: PatientService): void {
    service = override;
    controller = new PatientController(override);
}

export function getPatientService(): PatientService {
    return service;
}

export { controller as patientController };
export { service as patientService };
export { PatientController, PatientService };
export type { PatientSnapshot } from './patients.service';
