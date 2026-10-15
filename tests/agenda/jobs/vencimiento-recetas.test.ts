import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PrescriptionRepository } from '../../../src/modules/prescriptions/prescription.repository';
import { runVencimientoRecetas } from '../../../src/agenda/jobs/vencimiento-recetas';

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

function daysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
}

async function create(status: string, date: Date, extra: Record<string, unknown> = {}) {
    const doc = await repository.create({
        patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
        professional: { userId: '000000000000000000000001', businessName: 'Dr. Gómez' },
        supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 10 }],
        status,
        date,
        ...extra,
    } as any);
    return doc._id.toString();
}

describe('runVencimientoRecetas', () => {
    it('pasa a vigente una receta pendiente en rango', async () => {
        const id = await create('Pendiente', new Date());

        const result = await runVencimientoRecetas({ repository, diasLimite: 30 });

        const doc = await repository.findById(id);
        expect(result.aVigentes).toBe(1);
        expect(doc?.estadoActual?.tipo).toBe('vigente');
        expect(doc?.status).toBe('Pendiente');
    });

    it('vence una receta pendiente fuera de plazo sin dispensa', async () => {
        const id = await create('Pendiente', daysAgo(40));

        const result = await runVencimientoRecetas({ repository, diasLimite: 30 });

        const doc = await repository.findById(id);
        expect(result.aVencidas).toBe(1);
        expect(doc?.status).toBe('Vencida');
        expect(doc?.estadoActual?.tipo).toBe('vencida');
    });

    it('no vence una receta dispensada', async () => {
        const id = await create('Pendiente', daysAgo(40), {
            estadoDispensaActual: { tipo: 'dispensada', fecha: new Date() },
        });

        const result = await runVencimientoRecetas({ repository, diasLimite: 30 });

        const doc = await repository.findById(id);
        expect(result.aVencidas).toBe(0);
        expect(doc?.status).toBe('Pendiente');
    });
});
