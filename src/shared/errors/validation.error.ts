import { ApiError } from './base.error';

export class ValidationError extends ApiError {
    constructor(messageKey = 'errors.validation.default', details?: unknown[]) {
        super(422, 'VALIDATION_ERROR', messageKey, details);
    }
}
