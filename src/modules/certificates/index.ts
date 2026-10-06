import { CertificateRepository } from './certificates.repository';
import { CertificateService } from './certificates.service';
import { CertificateController } from './certificates.controller';
import { createLogger } from '@andes/log';

const logger = createLogger('certificates');

const repository = new CertificateRepository();
const service = new CertificateService(repository, logger);
const controller = new CertificateController(service);

export { controller as certificateController };
export { CertificateController, CertificateService, CertificateRepository };
