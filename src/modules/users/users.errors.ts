import { NotFoundError, BusinessError, ValidationError } from '../../shared/errors';

export class UserNotFoundError extends NotFoundError {
    constructor() {
        super('errors.notFound.user');
    }
}

export class UserNotActiveError extends BusinessError {
    constructor() {
        super('errors.auth.userInactive');
    }
}

export class EmailAlreadyTakenError extends BusinessError {
    constructor() {
        super('errors.validation.emailTaken');
    }
}

export class UsernameAlreadyTakenError extends BusinessError {
    constructor() {
        super('errors.validation.usernameTaken');
    }
}

export class InvalidEmailTokenError extends ValidationError {
    constructor() {
        super('errors.auth.invalidToken', [{ field: 'token', message: 'Token inválido o expirado' }]);
    }
}

export class SelfUpdateForbiddenError extends BusinessError {
    constructor() {
        super('errors.forbidden.selfUpdate');
    }
}

export class RoleNotFoundError extends NotFoundError {
    constructor() {
        super('errors.notFound.role');
    }
}
