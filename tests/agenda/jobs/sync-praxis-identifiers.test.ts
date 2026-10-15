import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PrescriptionRepository } from '../../../src/modules/prescriptions/prescription.repository';
import { PraxisClient } from '../../../src/integrations/praxis';
import { runPraxisSync } from '../../../src/agenda/jobs/sync-praxis-identifiers';

jest.setTimeout(15000);

let repository: PrescriptionRepository;

beforeAll(async () => {
    await connectTestDB();
    repository = new PrescriptionRepository();
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

async function createPending(intentos = 0) {
    const doc = await repository.create({
        patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
        professional: { userId: '000000000000000000000001', businessName: 'Dr. Gómez' },
        supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 10 }],
        status: 'Pendiente',
        date: new Date(),
    });
    await repository.updateSyncExterno(doc._id.toString(), {
        praxis: { estado: 'pendiente', intentos },
    });
    return doc._id.toString();
}

describe('runPraxisSync', () => {
    it('guarda el identificador y marca ok cuando Praxis responde', async () => {
        const id = await createPending(0);
        const client = {
            createPrescription: jest.fn(async () => ({ idPrescripcion: 'PRAX-OK', estado: 'creada' })),
        } as unknown as PraxisClient;

        await runPraxisSync({ client });

        const doc = await repository.findById(id);
        expect(doc?.syncExterno?.praxis?.estado).toBe('ok');
        expect(doc?.identificadoresExternos).toHaveLength(1);
        expect(doc?.identificadoresExternos![0]).toMatchObject({ entidad: 'praxis', valor: 'PRAX-OK' });
    });

    it('incrementa intentos y mantiene pendiente ante una falla transitoria', async () => {
        const id = await createPending(0);
        const client = {
            createPrescription: jest.fn(async () => { throw new Error('down'); }),
        } as unknown as PraxisClient;

        await runPraxisSync({ client });

        const doc = await repository.findById(id);
        expect(doc?.syncExterno?.praxis?.estado).toBe('pendiente');
        expect(doc?.syncExterno?.praxis?.intentos).toBe(1);
    });

    it('marca error al agotar los intentos', async () => {
        const id = await createPending(2);
        const client = {
            createPrescription: jest.fn(async () => { throw new Error('down'); }),
        } as unknown as PraxisClient;

        await runPraxisSync({ client, maxAttempts: 3 });

        const doc = await repository.findById(id);
        expect(doc?.syncExterno?.praxis?.estado).toBe('error');
        expect(doc?.syncExterno?.praxis?.intentos).toBe(3);
    });
});
