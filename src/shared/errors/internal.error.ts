import { ApiError } from './base.error';

export class InternalError extends ApiError {
    constructor(messageKey = 'errors.internal.default') {
        super(500, 'INTERNAL_ERROR', messageKey);
    }
}
