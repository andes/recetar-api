export { PraxisClient } from './praxis.client';
export { PraxisMapper } from './praxis.mapper';
export { checkPraxisEligibility } from './praxis.eligibility';
export type { PraxisEligibilityResult } from './praxis.eligibility';
export {
    PraxisConnectionError,
    PraxisAuthenticationError,
    PraxisPrescriptionError,
    PraxisAnnulmentError,
    PraxisNotEligibleError,
    PraxisResponseError,
    PraxisEligibilityError,
    PraxisPublicationError,
} from './praxis.errors';
export { createPraxisPrescriptionSchema } from './praxis.dto';
export type {
    PraxisPrescriptionRequest,
    PraxisPrescriptionResponse,
    PraxisRecetaEmitida,
    PraxisMensaje,
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
