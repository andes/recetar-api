import { ApiError } from './base.error';

export class ForbiddenError extends ApiError {
    constructor(messageKey = 'errors.forbidden.default') {
        super(403, 'FORBIDDEN', messageKey);
    }
}
