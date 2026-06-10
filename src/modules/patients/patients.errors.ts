import { NotFoundError, ValidationError } from '../../shared/errors';

export class PatientNotFoundError extends NotFoundError {
    constructor() {
        super('errors.notFound.patient');
    }
}

export class InvalidPatientDataError extends ValidationError {
    constructor(details: Array<{ field: string; message: string }>) {
        super('errors.validation.default', details);
    }
}
