import { AuthError, BusinessError, NotFoundError, ValidationError } from '../../shared/errors';

export class InvalidPasswordError extends AuthError {
    constructor() {
        super('errors.security.invalidPassword');
    }
}

export class InvalidPinError extends AuthError {
    constructor() {
        super('errors.security.invalidPin');
    }
}

export class PinAlreadyActiveError extends BusinessError {
    constructor() {
        super('errors.security.pinAlreadyActive');
    }
}

export class PinNotActiveError extends BusinessError {
    constructor() {
        super('errors.security.pinNotActive');
    }
}

export class WebAuthnCredentialNotFoundError extends NotFoundError {
    constructor() {
        super('errors.security.credentialNotFound');
    }
}

export class InvalidWebAuthnResponseError extends ValidationError {
    constructor() {
        super('errors.security.invalidWebAuthnResponse');
    }
}

export class ChallengeExpiredError extends ValidationError {
    constructor() {
        super('errors.security.challengeExpired');
    }
}

export class SecurityTokenInvalidError extends AuthError {
    constructor() {
        super('errors.security.invalidToken');
    }
}

export class SecurityTokenExpiredError extends AuthError {
    constructor() {
        super('errors.security.tokenExpired');
    }
}

export class PinRequiredError extends AuthError {
    constructor() {
        super('errors.security.pinRequired');
    }
}
