import request from 'supertest';
import mongoose from 'mongoose';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createAuthenticatedUser } from '../../helpers/auth';
import { createApp } from '../../helpers/app';

jest.setTimeout(15000);

const PrescriptionSchema = new mongoose.Schema({
    supplies: [{
        _id: false,
        supply: {
            name: { type: String },
            type: { type: String, enum: ['device', 'nutrition', 'magistral'] },
        },
        quantity: Number,
    }],
    status: { type: String, enum: ['Pendiente', 'Dispensada', 'Vencida'], default: 'Pendiente' },
    date: { type: Date, default: Date.now },
}, { strict: false, timestamps: true });

const Prescription = mongoose.models.Prescription
    || mongoose.model('Prescription', PrescriptionSchema);

let app: ReturnType<typeof createApp>;

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

function createTestPrescription(overrides = {}) {
    return Prescription.create({
        patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
        professional: { userId: 'prof123', businessName: 'Dr. Gómez' },
        supplies: [{ supply: { name: 'Ibuprofeno 400mg', type: 'device' }, quantity: 10 }],
        status: 'Pendiente',
        date: new Date(),
        ...overrides,
    });
}

describe('Prescriptions Controller', () => {
    describe('GET /api/prescriptions', () => {
        it('returns 200 with empty list', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app).get('/api/prescriptions').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.total).toBe(0);
        });

        it('returns 200 with prescriptions', async () => {
            const { token } = await createAuthenticatedUser();
            await createTestPrescription();
            const res = await request(app).get('/api/prescriptions').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.prescriptions).toHaveLength(1);
            expect(res.body.data.total).toBe(1);
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/prescriptions');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/prescriptions/user/:id', () => {
        it('returns 200', async () => {
            const { token } = await createAuthenticatedUser();
            await createTestPrescription({ professional: { userId: 'prof123', businessName: 'Dr.' } });
            const res = await request(app)
                .get('/api/prescriptions/user/prof123')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.prescriptions).toHaveLength(1);
        });
    });

    describe('GET /api/prescriptions/find/:patientId', () => {
        it('returns 200 with fallback on ANDES failure', async () => {
            const { token } = await createAuthenticatedUser();
            await createTestPrescription({ patient: { dni: '12345678', firstName: 'Juan', lastName: 'Pérez', sex: 'M' } });
            const res = await request(app)
                .get('/api/prescriptions/find/12345678')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.prescriptions).toHaveLength(1);
        });
    });

    describe('GET /api/prescriptions/dispensed-by/:cuil', () => {
        it('returns 200', async () => {
            const { token } = await createAuthenticatedUser();
            await createTestPrescription({
                status: 'Dispensada',
                dispensedBy: { cuil: '20-12345678-9', userId: 'farm123', businessName: 'Farm.' },
            });
            const res = await request(app)
                .get('/api/prescriptions/dispensed-by/20-12345678-9')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.prescriptions).toHaveLength(1);
        });
    });

    describe('GET /api/prescriptions/:id', () => {
        it('returns 200', async () => {
            const { token } = await createAuthenticatedUser();
            const created = await createTestPrescription();
            const res = await request(app)
                .get(`/api/prescriptions/${created._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.patient.firstName).toBe('Juan');
        });

        it('returns 404 for unknown id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .get('/api/prescriptions/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
            expect(res.body.error.code).toBe('RECURSO_NOT_FOUND');
        });
    });

    describe('POST /api/prescriptions', () => {
        it('returns 201 for valid data', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .post('/api/prescriptions')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
                    professional: { userId: 'prof123', businessName: 'Dr. Gómez' },
                    supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 10 }],
                });
            expect(res.status).toBe(201);
            expect(res.body.data.status).toBe('Pendiente');
            expect(res.body.data.prescriptionId).toBeDefined();
        });

        it('returns 422 for invalid data', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .post('/api/prescriptions')
                .set('Authorization', `Bearer ${token}`)
                .send({ patient: {} });
            expect(res.status).toBe(422);
        });
    });

    describe('PUT /api/prescriptions/:id', () => {
        it('returns 200', async () => {
            const { token } = await createAuthenticatedUser();
            const created = await createTestPrescription();
            const res = await request(app)
                .patch(`/api/prescriptions/${created._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ date: '2024-06-01' });
            expect(res.status).toBe(200);
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .patch('/api/prescriptions/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`)
                .send({ date: '2024-06-01' });
            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/prescriptions/:id/dispense', () => {
        it('returns 200', async () => {
            const { token } = await createAuthenticatedUser();
            const created = await createTestPrescription();
            const res = await request(app)
                .patch(`/api/prescriptions/${created._id}/dispense`)
                .set('Authorization', `Bearer ${token}`)
                .send({ userId: 'farm123', businessName: 'Farm. López' });
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('Dispensada');
        });

        it('returns 422 for missing fields', async () => {
            const { token } = await createAuthenticatedUser();
            const created = await createTestPrescription();
            const res = await request(app)
                .patch(`/api/prescriptions/${created._id}/dispense`)
                .set('Authorization', `Bearer ${token}`)
                .send({});
            expect(res.status).toBe(422);
        });

        it('returns 409 for already dispensed', async () => {
            const { token } = await createAuthenticatedUser();
            const created = await createTestPrescription({ status: 'Dispensada' });
            const res = await request(app)
                .patch(`/api/prescriptions/${created._id}/dispense`)
                .set('Authorization', `Bearer ${token}`)
                .send({ userId: 'farm123', businessName: 'Farm.' });
            expect(res.status).toBe(409);
        });
    });

    describe('PUT /api/prescriptions/:id/cancel-dispense', () => {
        it('returns 200', async () => {
            const { token } = await createAuthenticatedUser();
            const created = await createTestPrescription({
                status: 'Dispensada',
                dispensedBy: { userId: 'farm123', businessName: 'Farm. López' },
                dispensedAt: new Date(),
            });
            const res = await request(app)
                .patch(`/api/prescriptions/${created._id}/cancel-dispense?userId=farm123`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('Pendiente');
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .patch('/api/prescriptions/000000000000000000000000/cancel-dispense?userId=test')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/prescriptions/:id', () => {
        it('returns 204', async () => {
            const { token } = await createAuthenticatedUser();
            const created = await createTestPrescription();
            const res = await request(app)
                .delete(`/api/prescriptions/${created._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(204);
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .delete('/api/prescriptions/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });
    });
});
