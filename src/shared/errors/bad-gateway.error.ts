import { ApiError } from './base.error';

export class BadGatewayError extends ApiError {
    constructor(messageKey = 'errors.badGateway.default') {
        super(502, 'BAD_GATEWAY', messageKey);
    }
}
