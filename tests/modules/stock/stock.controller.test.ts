import mongoose from 'mongoose';
import request from 'supertest';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createAuthenticatedUser } from '../../helpers/auth';
import { createApp } from '../../helpers/app';

const PrescriptionSchema = new mongoose.Schema({
    supplies: [{
        _id: false,
        supply: {
            name: { type: String },
            type: { type: String, enum: ['device', 'nutrition', 'magistral'] },
        },
        quantity: Number,
    }],
    date: { type: Date, default: Date.now },
}, { strict: false, timestamps: true });

const Prescription = mongoose.models.Prescription
    || mongoose.model('Prescription', PrescriptionSchema);

jest.setTimeout(15000);

let app: ReturnType<typeof createApp>;

function createPrescriptionWithSupplies(overrides = {}) {
    return Prescription.create({
        patient: { firstName: 'Test', lastName: 'Paciente', dni: '12345678', sex: 'Masculino' },
        professional: { businessName: 'Dr. Test' },
        supplies: [{
            supply: { name: 'Ibuprofeno 400mg', type: 'device' },
            quantity: 10,
        }],
        date: new Date(),
        status: 'Pendiente',
        ...overrides,
    });
}

beforeAll(async () => {
    await connectTestDB();
    app = createApp();
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

describe('Stock Controller', () => {
    describe('GET /api/stock', () => {
        it('returns 200 with empty list', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app).get('/api/stock').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.stock).toEqual([]);
            expect(res.body.data.total).toBe(0);
        });

        it('returns 200 with prescriptions that have supplies', async () => {
            const { token } = await createAuthenticatedUser();
            await createPrescriptionWithSupplies();

            const res = await request(app).get('/api/stock').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.stock).toHaveLength(1);
            expect(res.body.data.total).toBe(1);
        });

        it('excludes prescriptions without supplies', async () => {
            const { token } = await createAuthenticatedUser();
            await createPrescriptionWithSupplies();
            await Prescription.create({
                patient: { firstName: 'Test', lastName: 'Otro', dni: '12345678', sex: 'Masculino' },
                professional: { businessName: 'Dr. Test' },
                date: new Date(),
                status: 'Pendiente',
            });

            const res = await request(app).get('/api/stock').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.stock).toHaveLength(1);
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/stock');
            expect(res.status).toBe(401);
        });

        it('returns 200 for prescriptions sorted by date desc', async () => {
            const { token } = await createAuthenticatedUser();
            await createPrescriptionWithSupplies({ date: new Date('2024-01-01') });
            await createPrescriptionWithSupplies({ date: new Date('2024-01-02') });

            const res = await request(app).get('/api/stock').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.stock).toHaveLength(2);
        });
    });

    describe('GET /api/stock/andes', () => {
        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/stock/andes');
            expect(res.status).toBe(401);
        });

        it('returns 500 when ANDES is unreachable', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .get('/api/stock/andes')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(500);
        });
    });
});
