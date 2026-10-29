import { NotFoundError } from '../../shared/errors';

export class PraxisEventNotFoundError extends NotFoundError {
    constructor() {
        super('errors.praxisEvent.notFound');
        this.name = 'PraxisEventNotFoundError';
    }
}
