import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PrescriptionRepository } from '../../../src/modules/prescriptions/prescription.repository';
import { PraxisClient } from '../../../src/integrations/praxis';
import { runPraxisSync } from '../../../src/agenda/jobs/sync-praxis-identifiers';
import Prescription from '../../../src/modules/prescriptions/prescription.model';

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

async function createPending(overrides: Record<string, unknown> = {}, intentos = 0) {
    const doc = await repository.create({
        patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
        professional: { userId: '000000000000000000000001', businessName: 'Dr. Gómez' },
        supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 10 }],
        status: 'Pendiente',
        date: new Date(),
        ...overrides,
    });
    await repository.updateSyncExterno(doc._id.toString(), {
        praxis: { estado: 'pendiente', intentos },
    });
    return doc._id.toString();
}

describe('runPraxisSync', () => {
    it('guarda el hash de prescripción y el de la receta y marca ok', async () => {
        const id = await createPending();
        const client = {
            createPrescription: jest.fn(async () => ({
                idPrescripcion: 1,
                hash: 'HASH-OK',
                recetasEmitidas: [{ idReceta: 10, hash: 'REC-OK' }],
            })),
        } as unknown as PraxisClient;

        await runPraxisSync({ client });

        const doc = await repository.findById(id);
        expect(doc?.syncExterno?.praxis?.estado).toBe('ok');
        expect(doc?.syncExterno?.praxis?.idPrescripcion).toBe('1');
        expect(doc?.identificadoresExternos?.some(e => e.entidad === 'praxis' && e.valor === 'HASH-OK')).toBe(true);
        expect(doc?.identificadoresExternos?.some(e => e.entidad === 'praxis-receta' && e.valor === 'REC-OK')).toBe(true);
    });

    it('agrupa los meses de un tratamiento prolongado en una sola llamada', async () => {
        const groupId = '000000000000000000000099';
        const ids = [];
        for (let index = 0; index < 3; index++) {
            ids.push(await createPending({
                treatmentGroupId: groupId,
                ordenTratamiento: index,
                tratamientoProlongado: 3,
            }));
        }
        const client = {
            createPrescription: jest.fn(async () => ({
                idPrescripcion: 2,
                hash: 'HASH-GROUP',
                recetasEmitidas: [
                    { hash: 'REC-1' },
                    { hash: 'REC-2' },
                    { hash: 'REC-3' },
                ],
            })),
        } as unknown as PraxisClient;

        await runPraxisSync({ client });

        const docs = await Prescription.find({ treatmentGroupId: groupId }).sort({ ordenTratamiento: 1 }).exec();
        expect(client.createPrescription).toHaveBeenCalledTimes(1);
        expect(docs.map(doc => doc.identificadoresExternos?.find(e => e.entidad === 'praxis-receta')?.valor))
            .toEqual(['REC-1', 'REC-2', 'REC-3']);
        expect(docs.every(doc => doc.identificadoresExternos?.some(e => e.entidad === 'praxis' && e.valor === 'HASH-GROUP'))).toBe(true);
    });

    it('incrementa intentos y mantiene pendiente ante una falla transitoria', async () => {
        const id = await createPending();
        const client = {
            createPrescription: jest.fn(async () => { throw new Error('down'); }),
        } as unknown as PraxisClient;

        await runPraxisSync({ client });

        const doc = await repository.findById(id);
        expect(doc?.syncExterno?.praxis?.estado).toBe('pendiente');
        expect(doc?.syncExterno?.praxis?.intentos).toBe(1);
    });

    it('marca error al agotar los intentos', async () => {
        const id = await createPending({}, 2);
        const client = {
            createPrescription: jest.fn(async () => { throw new Error('down'); }),
        } as unknown as PraxisClient;

        await runPraxisSync({ client, maxAttempts: 3 });

        const doc = await repository.findById(id);
        expect(doc?.syncExterno?.praxis?.estado).toBe('error');
        expect(doc?.syncExterno?.praxis?.intentos).toBe(3);
    });
});
