import { NotFoundError } from '../../shared/errors';

export class SupplyNotFoundError extends NotFoundError {
    constructor() {
        super('errors.notFound.supply');
    }
}
