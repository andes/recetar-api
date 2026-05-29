import { NotFoundError } from '../../shared/errors';
import { andesMessages } from './lang';

export class PrescriptionAndesNotFoundError extends NotFoundError {
    constructor() {
        super('');
        this.message = andesMessages.errors.notFound;
    }
}
