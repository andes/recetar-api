import request from 'supertest';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createAuthenticatedUser } from '../../helpers/auth';
import { createApp } from '../../helpers/app';
import Practice from '../../../src/modules/practices/practices.model';

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

describe('Practices Controller', () => {
    const practiceData = {
        date: '2025-01-15',
        patient: {
            firstName: 'Juan',
            lastName: 'Perez',
            dni: '12345678',
            sex: 'masculino',
        },
        professional: {
            userId: '000000000000000000000001',
        },
    };

    describe('GET /api/practices', () => {
        it('returns 200 with empty list', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app).get('/api/practices').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.practices).toEqual([]);
            expect(res.body.data.total).toBe(0);
            expect(res.body.data.offset).toBe(0);
            expect(res.body.data.limit).toBe(20);
        });

        it('returns 200 with practices', async () => {
            const { token } = await createAuthenticatedUser();
            await Practice.create(practiceData);

            const res = await request(app).get('/api/practices').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.practices).toHaveLength(1);
            expect(res.body.data.total).toBe(1);
        });

        it('returns 200 with practices filtered by userId', async () => {
            const { token } = await createAuthenticatedUser();
            await Practice.create(practiceData);

            const res = await request(app)
                .get('/api/practices?userId=000000000000000000000001')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.practices).toHaveLength(1);
            expect(res.body.data.total).toBe(1);
        });

        it('returns 200 with practices filtered by userId and searchTerm', async () => {
            const { token } = await createAuthenticatedUser();
            await Practice.create(practiceData);

            const res = await request(app)
                .get('/api/practices?userId=000000000000000000000001&searchTerm=Juan')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.practices).toHaveLength(1);
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/practices');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/practices/:id', () => {
        it('returns 200 with practice', async () => {
            const { token } = await createAuthenticatedUser();
            const practice = await Practice.create(practiceData);

            const res = await request(app)
                .get(`/api/practices/${practice._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.patient.firstName).toBe('Juan');
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .get('/api/practices/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
            expect(res.body.error.code).toBe('RECURSO_NOT_FOUND');
        });

        it('returns 404 without token (public route)', async () => {
            const res = await request(app).get('/api/practices/000000000000000000000000');
            expect(res.status).toBe(404);
        });
    });

    describe('POST /api/practices', () => {
        it('returns 201 with created practice', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .post('/api/practices')
                .set('Authorization', `Bearer ${token}`)
                .send(practiceData);
            expect(res.status).toBe(201);
            expect(res.body.data.patient.firstName).toBe('Juan');
        });

        it('returns 422 for missing required fields', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .post('/api/practices')
                .set('Authorization', `Bearer ${token}`)
                .send({});
            expect(res.status).toBe(422);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('returns 401 without token', async () => {
            const res = await request(app)
                .post('/api/practices')
                .send(practiceData);
            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/practices/:id', () => {
        it('returns 200 with updated practice', async () => {
            const { token } = await createAuthenticatedUser();
            const practice = await Practice.create(practiceData);

            const res = await request(app)
                .patch(`/api/practices/${practice._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ diagnostic: 'Nuevo diagnóstico' });
            expect(res.status).toBe(200);
            expect(res.body.data.diagnostic).toBe('Nuevo diagnóstico');
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .patch('/api/practices/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`)
                .send({ diagnostic: 'X' });
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/practices/:id', () => {
        it('returns 204 on successful delete', async () => {
            const { token } = await createAuthenticatedUser();
            const practice = await Practice.create(practiceData);

            const res = await request(app)
                .delete(`/api/practices/${practice._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(204);
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .delete('/api/practices/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });

        it('returns 401 without token', async () => {
            const res = await request(app).delete('/api/practices/000000000000000000000000');
            expect(res.status).toBe(401);
        });
    });
});
