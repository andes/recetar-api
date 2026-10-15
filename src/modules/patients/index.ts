import { PatientService } from './patients.service';
import { PatientController } from './patients.controller';
import { AndesClient } from '../../integrations/andes';
import { devLogger } from '../../shared/logger/dev-logger';
import { env } from '../../config/config';

const andesClient = new AndesClient({
    andesEndpoint: env.ANDES_ENDPOINT,
    jwtMpiToken: env.JWT_MPI_TOKEN,
    mpiEndpoint: env.ANDES_MPI_ENDPOINT,
});
let service = new PatientService(andesClient, devLogger);
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
