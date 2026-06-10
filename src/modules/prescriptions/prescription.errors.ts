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
