import { PrescriptionRepository } from './prescription.repository';
import { PrescriptionService } from './prescription.service';
import { PrescriptionController } from './prescription.controller';
import { AndesClient, PrescriptionAndesRepository } from '../../integrations/andes';
import { PraxisClient } from '../../integrations/praxis';
import { createProfessionalService } from '../professionals';
import { getPatientService } from '../patients';
import { UsersRepository } from '../users/users.repository';
import { devLogger } from '../../shared/logger/dev-logger';
import { env } from '../../config/config';
import { SecurityRepository } from '../security/security.repository';
import { SecurityService } from '../security/security.service';

const prescriptionRepository = new PrescriptionRepository();
const prescriptionAndesRepository = new PrescriptionAndesRepository();
const andesClient = new AndesClient({
    andesEndpoint: env.ANDES_ENDPOINT,
    jwtMpiToken: env.JWT_MPI_TOKEN,
    mpiEndpoint: env.ANDES_MPI_ENDPOINT,
});
const usersRepository = new UsersRepository();
// En tests no se publica a Praxis (evita llamadas externas); los tests de Praxis
// construyen el servicio con un cliente mockeado.
const praxisClient = process.env.NODE_ENV === 'test'
    ? undefined
    : new PraxisClient({
        praxisEndpoint: env.PRAXYS_ENDPOINT,
        praxisApiKey: env.PRAXYS_API_KEY,
    });
const professionalProfileService = createProfessionalService(andesClient, devLogger);
const service = new PrescriptionService(
    prescriptionRepository,
    prescriptionAndesRepository,
    andesClient,
    getPatientService,
    devLogger,
    usersRepository,
    praxisClient,
    professionalProfileService,
);

const securityRepository = new SecurityRepository();
const securityService = new SecurityService(securityRepository);
const controller = new PrescriptionController(service, securityService);

export { controller as prescriptionController };
export { PrescriptionController, PrescriptionService, PrescriptionRepository };
