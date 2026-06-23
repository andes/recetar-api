import { PrescriptionRepository } from './prescription.repository';
import { PrescriptionService } from './prescription.service';
import { PrescriptionController } from './prescription.controller';
import { AndesClient, PrescriptionAndesRepository } from '../../integrations/andes';
import { createLogger } from '@andes/log';
import { env } from '../../config/config';
import { SecurityRepository } from '../security/security.repository';
import { SecurityService } from '../security/security.service';

const logger = createLogger('prescriptions');

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
    logger,
);

const securityRepository = new SecurityRepository();
const securityService = new SecurityService(securityRepository);
const controller = new PrescriptionController(service, securityService);

export { controller as prescriptionController };
export { PrescriptionController, PrescriptionService, PrescriptionRepository };
