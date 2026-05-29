import { NotFoundError } from '../../shared/errors';

export class CertificateNotFoundError extends NotFoundError {
    constructor() {
        super('errors.notFound.certificate');
    }
}
