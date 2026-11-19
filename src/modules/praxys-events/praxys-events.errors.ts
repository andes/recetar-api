import { NotFoundError } from '../../shared/errors';

export class PraxysEventNotFoundError extends NotFoundError {
    constructor() {
        super('errors.praxysEvent.notFound');
        this.name = 'PraxysEventNotFoundError';
    }
}
