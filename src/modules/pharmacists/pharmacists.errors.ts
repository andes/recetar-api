import { NotFoundError } from '../../shared/errors';

export class PharmacistNotFoundError extends NotFoundError {
    constructor() {
        super('errors.notFound.pharmacist');
    }
}

export class PharmacyNotFoundError extends NotFoundError {
    constructor() {
        super('errors.notFound.pharmacy');
    }
}
