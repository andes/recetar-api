import request from 'supertest';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createApp } from '../../helpers/app';
import { createAuthenticatedUser } from '../../helpers/auth';
import Pharmacist from '../../../src/modules/pharmacists/pharmacists.model';
import Pharmacy from '../../../src/modules/pharmacists/pharmacy.model';

jest.setTimeout(15000);

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

describe('Pharmacies Controller', () => {
    describe('GET /api/pharmacies', () => {
        it('returns 200 with empty list', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app).get('/api/pharmacies').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/pharmacies');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/pharmacies/:id', () => {
        it('returns 200 with pharmacy', async () => {
            const { token } = await createAuthenticatedUser();
            const pharmacist = await Pharmacist.create({ enrollment: 'FARM001', lastName: 'López', firstName: 'María', sex: 'Femenino' });
            const pharmacy = await Pharmacy.create({ cuit: '30-12345678-9', name: 'Farmacia Central', city: 'Ciudad', pharmacist: pharmacist._id });

            const res = await request(app)
                .get(`/api/pharmacies/${pharmacy._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe('Farmacia Central');
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .get('/api/pharmacies/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('POST /api/pharmacies', () => {
        it('returns 201 with created pharmacy', async () => {
            const { token } = await createAuthenticatedUser();
            const pharmacist = await Pharmacist.create({ enrollment: 'FARM001', lastName: 'López', firstName: 'María', sex: 'Femenino' });

            const res = await request(app)
                .post('/api/pharmacies')
                .set('Authorization', `Bearer ${token}`)
                .send({ cuit: '30-12345678-9', name: 'Farmacia Central', city: 'Ciudad', pharmacist: pharmacist._id.toString() });

            expect(res.status).toBe(201);
            expect(res.body.data.name).toBe('Farmacia Central');
        });

        it('returns 422 for missing fields', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .post('/api/pharmacies')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Farmacia' });

            expect(res.status).toBe(422);
        });

        it('returns 422 for invalid pharmacist ObjectId', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .post('/api/pharmacies')
                .set('Authorization', `Bearer ${token}`)
                .send({ cuit: '30-12345678-9', name: 'Farmacia', city: 'Ciudad', pharmacist: 'not-an-objectid' });

            expect(res.status).toBe(422);
        });

        it('returns 404 for non-existent pharmacist', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .post('/api/pharmacies')
                .set('Authorization', `Bearer ${token}`)
                .send({ cuit: '30-12345678-9', name: 'Farmacia', city: 'Ciudad', pharmacist: '000000000000000000000000' });

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/pharmacies/:id', () => {
        it('returns 200 with updated pharmacy', async () => {
            const { token } = await createAuthenticatedUser();
            const pharmacist = await Pharmacist.create({ enrollment: 'FARM001', lastName: 'López', firstName: 'María', sex: 'Femenino' });
            const pharmacy = await Pharmacy.create({ cuit: '30-12345678-9', name: 'Farmacia Central', city: 'Ciudad', pharmacist: pharmacist._id });

            const res = await request(app)
                .patch(`/api/pharmacies/${pharmacy._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Farmacia Norte' });

            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe('Farmacia Norte');
        });
    });

    describe('DELETE /api/pharmacies/:id', () => {
        it('returns 204 on successful delete', async () => {
            const { token } = await createAuthenticatedUser();
            const pharmacist = await Pharmacist.create({ enrollment: 'FARM001', lastName: 'López', firstName: 'María', sex: 'Femenino' });
            const pharmacy = await Pharmacy.create({ cuit: '30-12345678-9', name: 'Farmacia Central', city: 'Ciudad', pharmacist: pharmacist._id });

            const res = await request(app)
                .delete(`/api/pharmacies/${pharmacy._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(204);
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .delete('/api/pharmacies/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });
});
