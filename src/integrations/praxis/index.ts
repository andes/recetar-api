export { PraxisClient } from './praxis.client';
export { PraxisMapper } from './praxis.mapper';
export {
    PraxisConnectionError,
    PraxisAuthenticationError,
    PraxisPrescriptionError,
    PraxisAnnulmentError,
} from './praxis.errors';
export { createPraxisPrescriptionSchema } from './praxis.dto';
export type {
    PraxisPrescriptionRequest,
    PraxisPrescriptionResponse,
    PraxisPaciente,
    PraxisCoberturaSalud,
    PraxisPrescriptor,
    PraxisRenglon,
    PraxisDiagnostico,
    PraxisProducto,
} from './praxis.types';
export type {
    CreatePraxisPrescriptionDTO,
    PraxisPacienteDTO,
    PraxisCoberturaDTO,
    PraxisPrescriptorDTO,
    PraxisRenglonDTO,
} from './praxis.dto';
