import { NotFoundError, ValidationError, ApiError } from '../../shared/errors';

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

export class DuplicateDniError extends ApiError {
    constructor() {
        super(422, 'PATIENT_DUPLICATED', 'errors.patient.duplicateDni', [
            { field: 'dni', message: 'Ya existe un paciente con ese DNI' }
        ]);
    }
}

export class ValidationUnavailableError extends ApiError {
    constructor() {
        super(502, 'VALIDATION_UNAVAILABLE', 'errors.validation.unavailable', [
            { field: 'validation', message: 'El servicio de validacion no esta disponible' }
        ]);
    }
}
