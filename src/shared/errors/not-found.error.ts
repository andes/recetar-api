import { ApiError } from './base.error';

export class NotFoundError extends ApiError {
    constructor(messageKey = 'errors.notFound.default') {
        super(404, 'RECURSO_NOT_FOUND', messageKey);
    }
}
