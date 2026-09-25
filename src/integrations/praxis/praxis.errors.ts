import { InternalError } from '../../shared/errors';

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
