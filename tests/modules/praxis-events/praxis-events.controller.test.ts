import request from 'supertest';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createApp } from '../../helpers/app';
import { PrescriptionRepository } from '../../../src/modules/prescriptions/prescription.repository';
import PraxisEvent from '../../../src/modules/praxis-events/praxis-event.model';

jest.setTimeout(15000);

let app: ReturnType<typeof createApp>;
let repository: PrescriptionRepository;

beforeAll(async () => {
    await connectTestDB();
    await PraxisEvent.init();
    app = createApp();
    repository = new PrescriptionRepository();
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
    process.env.PRAXIS_INBOUND_ENABLED = 'true';
    delete process.env.PRAXIS_INBOUND_ALLOWED_IPS;
    delete process.env.PRAXIS_INBOUND_API_KEY;
    delete process.env.PRAXIS_INBOUND_ENFORCE_HTTPS;
});

function buildDoc(overrides: Record<string, unknown> = {}) {
    return {
        prescriptionId: `P-${Math.random().toString(36).slice(2, 8)}`,
        patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
        professional: { userId: '000000000000000000000001', businessName: 'Dr. Gómez' },
        supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 1 }],
        status: 'Pendiente',
        date: new Date(),
        ...overrides,
    };
}

describe('API /api/praxis', () => {
    it('anula una receta por hash y responde 200', async () => {
        const doc = await repository.create(buildDoc({
            identificadoresExternos: [{ entidad: 'praxis-receta', valor: 'REC-1' }],
        }) as any);

        const response = await request(app).delete('/api/praxis/recetas/REC-1');

        const found = await repository.findById(doc._id.toString());
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(found?.estadoActual?.tipo).toBe('eliminada');
    });

    it('responde 404 con envelope cuando el hash no existe', async () => {
        const response = await request(app).delete('/api/praxis/recetas/UNKNOWN');

        expect(response.status).toBe(404);
        expect(response.body.status).toBe('error');
        expect(response.body.error.code).toBe('RECURSO_NOT_FOUND');
    });

    it('registra el alta y responde 200 en la entrega repetida', async () => {
        const payload = {
            hash: 'PRESC-1',
            recetas: [{ hash: 'REC-1' }],
            renglones: [{ cantidadEnvases: 1 }],
        };

        const first = await request(app).post('/api/praxis/prescripciones').send(payload);
        const second = await request(app).post('/api/praxis/prescripciones').send(payload);

        expect(first.status).toBe(201);
        expect(second.status).toBe(200);
        expect(first.body.data.estado).toBe('desconocido');
        expect(second.body.data.duplicate).toBe(true);
    });

    it('dispensa una receta y no duplica la dispensa en reintentos', async () => {
        await repository.create(buildDoc({
            identificadoresExternos: [{ entidad: 'praxis-receta', valor: 'REC-2' }],
        }) as any);
        const payload = {
            dispensa: {
                numeroAutorizacion: 'OPF-1',
                renglones: [{ producto: { descripcion: 'Ibuprofeno' }, cantidadEnvases: 1 }],
            },
        };

        const first = await request(app).post('/api/praxis/recetas/REC-2/dispensa').send(payload);
        const second = await request(app).post('/api/praxis/recetas/REC-2/dispensa').send(payload);

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(second.body.data.duplicate).toBe(true);
    });

    it('responde 422 con un body inválido', async () => {
        const response = await request(app)
            .post('/api/praxis/recetas/REC-2/dispensa')
            .send({ dispensa: { renglones: [] } });

        expect(response.status).toBe(422);
        expect(response.body.status).toBe('error');
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('mantiene las rutas existentes intactas', async () => {
        const prescriptions = await request(app).get('/api/prescriptions');
        const recetas = await request(app).get('/api/modules/recetas');

        expect(prescriptions.status).toBe(401);
        expect(recetas.status).toBe(401);
    });
});
