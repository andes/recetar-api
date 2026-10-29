import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PraxisEventsRepository } from '../../../src/modules/praxis-events/praxis-events.repository';
import PraxisEvent from '../../../src/modules/praxis-events/praxis-event.model';

jest.setTimeout(15000);

let repository: PraxisEventsRepository;

beforeAll(async () => {
    await connectTestDB();
    await PraxisEvent.init();
    repository = new PraxisEventsRepository();
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

describe('PraxisEventsRepository', () => {
    it('registra un evento nuevo', async () => {
        const { event, duplicate } = await repository.record({
            claveIdempotencia: 'alta:HASH-1',
            tipo: 'prescripcion',
            hash: 'HASH-1',
            payload: { hash: 'HASH-1' },
            estado: 'error',
        });

        expect(duplicate).toBe(false);
        expect(event.claveIdempotencia).toBe('alta:HASH-1');
        expect(event.estado).toBe('error');
    });

    it('traduce el duplicado en el evento existente', async () => {
        const first = await repository.record({
            claveIdempotencia: 'alta:HASH-1',
            tipo: 'prescripcion',
            hash: 'HASH-1',
        });

        const second = await repository.record({
            claveIdempotencia: 'alta:HASH-1',
            tipo: 'prescripcion',
            hash: 'HASH-1',
        });

        expect(second.duplicate).toBe(true);
        expect(second.event._id.toString()).toBe(first.event._id.toString());
    });

    it('actualiza el estado del evento', async () => {
        const { event } = await repository.record({
            claveIdempotencia: 'anulacion-receta:REC-1',
            tipo: 'anulacion-receta',
            hash: 'REC-1',
        });

        const updated = await repository.update(event._id.toString(), {
            estado: 'procesado',
            prescriptionId: 'DOC-1',
        });

        expect(updated?.estado).toBe('procesado');
        expect(updated?.prescriptionId).toBe('DOC-1');
    });

    it('define el TTL del payload en la colección', async () => {
        const indexes = await PraxisEvent.collection.indexes();
        expect(indexes.some(index => index.expireAfterSeconds != null)).toBe(true);
    });
});
