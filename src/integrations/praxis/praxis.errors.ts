import { ApiError, InternalError } from '../../shared/errors';

export class PraxisConnectionError extends InternalError {
    constructor(message = 'Error de conexión con Praxis') {
        super(message);
        this.name = 'PraxisConnectionError';
    }
}

export class PraxisAuthenticationError extends InternalError {
    constructor(message = 'Error de autenticación con Praxis. Verifique la API key.') {
        super(message);
        this.name = 'PraxisAuthenticationError';
    }
}

export class PraxisPrescriptionError extends InternalError {
    constructor(message = 'Error al crear prescripción en Praxis') {
        super(message);
        this.name = 'PraxisPrescriptionError';
    }
}

export class PraxisAnnulmentError extends InternalError {
    constructor(message = 'Error al anular prescripción en Praxis') {
        super(message);
        this.name = 'PraxisAnnulmentError';
    }
}

// La receta no cumple los requisitos mínimos para publicarse en Praxis.
// No se debe reintentar (no es un error transitorio).
export class PraxisNotEligibleError extends Error {
    constructor(
        public readonly reason: string,
        public readonly codigo?: number | string,
    ) {
        super(reason);
        this.name = 'PraxisNotEligibleError';
    }
}

// Praxis respondió con un mensaje de error/aviso (severidad E) o rechazó la operación.
export class PraxisResponseError extends Error {
    constructor(
        message: string,
        public readonly codigo?: number | string,
        public readonly severidad?: string,
    ) {
        super(message);
        this.name = 'PraxisResponseError';
    }
}

// La receta tiene un problema de datos/elegibilidad que impide publicarla.
// Se bloquea la emisión y no se persiste el documento.
export class PraxisEligibilityError extends ApiError {
    constructor(
        message: string,
        public readonly codigo?: number | string,
    ) {
        super(422, 'PRAXIS_NOT_ELIGIBLE');
        this.message = message;
        this.name = 'PraxisEligibilityError';
    }
}

// Praxis rechazó o no respondió. Se bloquea la emisión y no se persiste el documento.
export class PraxisPublicationError extends ApiError {
    constructor(
        message: string,
        public readonly codigo?: number | string,
    ) {
        super(502, 'PRAXIS_PUBLICATION_ERROR');
        this.message = message;
        this.name = 'PraxisPublicationError';
    }
}
