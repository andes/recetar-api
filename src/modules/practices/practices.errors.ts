import { NotFoundError } from '../../shared/errors';

export class PracticeNotFoundError extends NotFoundError {
    constructor() {
        super('errors.notFound.practice');
    }
}
