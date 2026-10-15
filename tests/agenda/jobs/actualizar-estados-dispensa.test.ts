import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PrescriptionRepository } from '../../../src/modules/prescriptions/prescription.repository';
import { runActualizarEstadosDispensa } from '../../../src/agenda/jobs/actualizar-estados-dispensa';

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

async function createParcial(cantidadDispensada: number, cantidadRequerida: number): Promise<string> {
    const doc = await repository.create({
        patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
        professional: { userId: '000000000000000000000001', businessName: 'Dr. Gómez' },
        supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: cantidadRequerida }],
        status: 'Dispensada',
        date: new Date(),
        estadoDispensaActual: { tipo: 'dispensa-parcial', fecha: new Date() },
        dispensa: [{ cantidad: cantidadDispensada, fecha: new Date() }],
    } as any);
    return doc._id.toString();
}

describe('runActualizarEstadosDispensa', () => {
    it('marca dispensada cuando la cantidad acumulada cubre la requerida', async () => {
        const id = await createParcial(10, 10);

        const result = await runActualizarEstadosDispensa({ repository });

        const doc = await repository.findById(id);
        expect(result.reconciliadas).toBe(1);
        expect(doc?.estadoDispensaActual?.tipo).toBe('dispensada');
        expect(doc?.status).toBe('Dispensada');
    });

    it('no reconcilia cuando la cantidad no alcanza', async () => {
        const id = await createParcial(3, 10);

        const result = await runActualizarEstadosDispensa({ repository });

        const doc = await repository.findById(id);
        expect(result.reconciliadas).toBe(0);
        expect(doc?.estadoDispensaActual?.tipo).toBe('dispensa-parcial');
    });
});
