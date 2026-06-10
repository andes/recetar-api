import request from 'supertest';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createAuthenticatedUser } from '../../helpers/auth';
import { createApp } from '../../helpers/app';
import Pharmacist from '../../../src/modules/pharmacists/pharmacists.model';

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

describe('Pharmacists Controller', () => {
    describe('GET /api/pharmacists', () => {
        it('returns 200 with empty list', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app).get('/api/pharmacists').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });

        it('returns 200 with pharmacists', async () => {
            const { token } = await createAuthenticatedUser();
            await Pharmacist.create({ enrollment: 'FARM001', lastName: 'López', firstName: 'María', sex: 'Femenino' });

            const res = await request(app).get('/api/pharmacists').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/pharmacists');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/pharmacists/:id', () => {
        it('returns 200 with pharmacist', async () => {
            const { token } = await createAuthenticatedUser();
            const pharmacist = await Pharmacist.create({ enrollment: 'FARM001', lastName: 'López', firstName: 'María', sex: 'Femenino' });

            const res = await request(app)
                .get(`/api/pharmacists/${pharmacist._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.data.enrollment).toBe('FARM001');
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .get('/api/pharmacists/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/pharmacists/000000000000000000000000');
            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/pharmacists', () => {
        it('returns 201 with created pharmacist', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .post('/api/pharmacists')
                .set('Authorization', `Bearer ${token}`)
                .send({ enrollment: 'FARM001', lastName: 'López', firstName: 'María', sex: 'Femenino' });

            expect(res.status).toBe(201);
            expect(res.body.data.enrollment).toBe('FARM001');
        });

        it('returns 422 for missing fields', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .post('/api/pharmacists')
                .set('Authorization', `Bearer ${token}`)
                .send({ enrollment: 'FARM001' });

            expect(res.status).toBe(422);
        });

        it('returns 401 without token', async () => {
            const res = await request(app)
                .post('/api/pharmacists')
                .send({ enrollment: 'FARM001', lastName: 'López', firstName: 'María', sex: 'Femenino' });

            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/pharmacists/:id', () => {
        it('returns 200 with updated pharmacist', async () => {
            const { token } = await createAuthenticatedUser();
            const pharmacist = await Pharmacist.create({ enrollment: 'FARM001', lastName: 'López', firstName: 'María', sex: 'Femenino' });

            const res = await request(app)
                .patch(`/api/pharmacists/${pharmacist._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ firstName: 'Ana María' });

            expect(res.status).toBe(200);
            expect(res.body.data.firstName).toBe('Ana María');
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .patch('/api/pharmacists/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`)
                .send({ firstName: 'X' });

            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/pharmacists/:id', () => {
        it('returns 204 on successful delete', async () => {
            const { token } = await createAuthenticatedUser();
            const pharmacist = await Pharmacist.create({ enrollment: 'FARM001', lastName: 'López', firstName: 'María', sex: 'Femenino' });

            const res = await request(app)
                .delete(`/api/pharmacists/${pharmacist._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(204);
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .delete('/api/pharmacists/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        it('returns 401 without token', async () => {
            const res = await request(app).delete('/api/pharmacists/000000000000000000000000');
            expect(res.status).toBe(401);
        });
    });
});
