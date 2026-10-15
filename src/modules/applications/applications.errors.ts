import { NotFoundError, BusinessError, AuthError } from '../../shared/errors';

export class ApplicationNotFoundError extends NotFoundError {
    constructor() {
        super('errors.notFound.application');
    }
}

export class ApplicationInactiveError extends BusinessError {
    constructor() {
        super('errors.application.inactive');
    }
}

export class ApplicationTokenInvalidError extends AuthError {
    constructor() {
        super('errors.auth.invalidToken');
    }
}
