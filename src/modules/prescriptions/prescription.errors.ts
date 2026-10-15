import { NotFoundError, BusinessError } from '../../shared/errors';

export class PrescriptionNotFoundError extends NotFoundError {
    constructor() {
        super('errors.notFound.prescription');
    }
}

export class PrescriptionAlreadyDispensedError extends BusinessError {
    constructor() {
        super('errors.business.alreadyDispensed');
    }
}

export class PrescriptionNotDispensableError extends BusinessError {
    constructor() {
        super('errors.business.notDispensable');
    }
}

export class PrescriptionCancelTimeExceededError extends BusinessError {
    constructor() {
        super('errors.business.cancelTimeExceeded');
    }
}

export class PrescriptionAlreadyCancelledError extends BusinessError {
    constructor() {
        super('errors.business.alreadyCancelled');
    }
}

export class TreatmentRequiresMedicationsError extends BusinessError {
    constructor() {
        super('errors.business.treatmentRequiresMedications');
    }
}

export class PrescriptionNotSuspendableError extends BusinessError {
    constructor() {
        super('errors.business.notSuspendable');
    }
}

export class PrescriptionPublishedError extends BusinessError {
    constructor() {
        super('errors.business.publishedPrescription');
    }
}

export class PrescriptionPdfUnavailableError extends NotFoundError {
    constructor() {
        super('errors.notFound.prescriptionPdf');
    }
}
