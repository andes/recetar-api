import { CertificateRepository } from './certificates.repository';
import { CertificateService } from './certificates.service';
import { CertificateController } from './certificates.controller';
import { devLogger } from '../../shared/logger/dev-logger';
import { getPatientService } from '../patients';
import { createProfessionalService } from '../professionals';

const repository = new CertificateRepository();
const professionalProfileService = createProfessionalService(undefined, devLogger);
const service = new CertificateService(repository, getPatientService, devLogger, professionalProfileService);
const controller = new CertificateController(service);

export { controller as certificateController };
export { CertificateController, CertificateService, CertificateRepository };
