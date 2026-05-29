import { ApiError } from './base.error';

export class BusinessError extends ApiError {
    constructor(messageKey = 'errors.business.prescriptionNotFound') {
        super(409, 'BUSINESS_RULE_VIOLATION', messageKey);
    }
}
