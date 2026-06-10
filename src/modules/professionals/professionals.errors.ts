import { NotFoundError } from '../../shared/errors';

export class ProfessionalNotFoundError extends NotFoundError {
    constructor() {
        super('errors.notFound.professional');
    }
}
