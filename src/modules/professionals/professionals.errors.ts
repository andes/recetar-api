import { NotFoundError, ValidationError } from '../../shared/errors';

export class ProfessionalNotFoundError extends NotFoundError {
    constructor() {
        super('errors.notFound.professional');
    }
}

// No se pudieron resolver los datos del profesional (matrícula/formación) desde ANDES.
export class ProfessionalFormationRequiredError extends ValidationError {
    constructor() {
        super('errors.validation.professionalFormationRequired');
    }
}

// No se pudo resolver el CUIT/CUIL del profesional (ni ANDES ni la cuenta de RecetAr).
export class ProfessionalCuilRequiredError extends ValidationError {
    constructor() {
        super('errors.validation.professionalCuilRequired');
    }
}
