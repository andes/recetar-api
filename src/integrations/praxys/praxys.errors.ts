import { ApiError, InternalError } from '../../shared/errors';

export class PraxysConnectionError extends InternalError {
    constructor(message = 'Error de conexión con Praxys') {
        super(message);
        this.name = 'PraxysConnectionError';
    }
}

export class PraxysAuthenticationError extends InternalError {
    constructor(message = 'Error de autenticación con Praxys. Verifique la API key.') {
        super(message);
        this.name = 'PraxysAuthenticationError';
    }
}

export class PraxysPrescriptionError extends InternalError {
    constructor(message = 'Error al crear prescripción en Praxys') {
        super(message);
        this.name = 'PraxysPrescriptionError';
    }
}

export class PraxysAnnulmentError extends InternalError {
    constructor(message = 'Error al anular prescripción en Praxys') {
        super(message);
        this.name = 'PraxysAnnulmentError';
    }
}

// La receta no cumple los requisitos mínimos para publicarse en Praxys.
// No se debe reintentar (no es un error transitorio).
export class PraxysNotEligibleError extends Error {
    constructor(
        public readonly reason: string,
        public readonly codigo?: number | string,
    ) {
        super(reason);
        this.name = 'PraxysNotEligibleError';
    }
}

// Praxys respondió con un mensaje de error/aviso (severidad E) o rechazó la operación.
export class PraxysResponseError extends Error {
    constructor(
        message: string,
        public readonly codigo?: number | string,
        public readonly severidad?: string,
    ) {
        super(message);
        this.name = 'PraxysResponseError';
    }
}

// La receta tiene un problema de datos/elegibilidad que impide publicarla.
// Se bloquea la emisión y no se persiste el documento.
export class PraxysEligibilityError extends ApiError {
    constructor(
        message: string,
        public readonly codigo?: number | string,
    ) {
        super(422, 'PRAXYS_NOT_ELIGIBLE');
        this.message = message;
        this.name = 'PraxysEligibilityError';
    }
}

// Praxys rechazó o no respondió. Se bloquea la emisión y no se persiste el documento.
export class PraxysPublicationError extends ApiError {
    constructor(
        message: string,
        public readonly codigo?: number | string,
    ) {
        super(502, 'PRAXYS_PUBLICATION_ERROR');
        this.message = message;
        this.name = 'PraxysPublicationError';
    }
}
