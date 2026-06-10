import { AuthError, NotFoundError, BusinessError, ValidationError } from '../../shared/errors';

export class InvalidCredentialsError extends AuthError {
    constructor() {
        super('errors.auth.invalidCredentials');
    }
}

export class UserNotFoundError extends NotFoundError {
    constructor() {
        super('errors.notFound.user');
    }
}

export class UserAlreadyExistsError extends BusinessError {
    constructor() {
        super('errors.validation.duplicateUser');
    }
}

export class PasswordExpiredError extends AuthError {
    constructor() {
        super('errors.auth.expiredPassword');
    }
}

export class InvalidLinkError extends AuthError {
    constructor() {
        super('errors.auth.invalidToken');
    }
}

export class SamePasswordError extends ValidationError {
    constructor() {
        super('errors.validation.weakPassword', [{ field: 'newPassword', message: 'Debe ser distinta a la anterior' }]);
    }
}
