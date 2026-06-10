import { CertificateRepository } from './certificates.repository';
import { CertificateService } from './certificates.service';
import { CertificateController } from './certificates.controller';
import { Logger } from '../../shared/logger/logger.interface';

const logger: Logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const repository = new CertificateRepository();
const service = new CertificateService(repository, logger as any);
const controller = new CertificateController(service);

export { controller as certificateController };
export { CertificateController, CertificateService, CertificateRepository };
