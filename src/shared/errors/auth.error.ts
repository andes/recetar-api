import { ApiError } from './base.error';

export class AuthError extends ApiError {
    constructor(messageKey = 'errors.auth.default') {
        super(401, 'UNAUTHORIZED', messageKey);
    }
}
