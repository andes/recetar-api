import request from 'supertest';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createAuthenticatedUser } from '../../helpers/auth';
import { createApp } from '../../helpers/app';
import Supply from '../../../src/modules/supplies/supplies.model';

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

describe('Supplies Controller', () => {
    describe('GET /api/supplies', () => {
        it('returns 200 with empty list', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app).get('/api/supplies').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });

        it('returns 200 with supplies', async () => {
            const { token } = await createAuthenticatedUser();
            await Supply.create({ name: 'Ibuprofeno 400mg' });

            const res = await request(app).get('/api/supplies').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });

        it('returns 200 with supplies filtered by name', async () => {
            const { token } = await createAuthenticatedUser();
            await Supply.create({ name: 'Ibuprofeno 400mg' });
            await Supply.create({ name: 'Paracetamol 500mg' });

            const res = await request(app)
                .get('/api/supplies?name=ibuprofeno')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].name).toBe('Ibuprofeno 400mg');
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/supplies');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/supplies/:id', () => {
        it('returns 200 with supply', async () => {
            const { token } = await createAuthenticatedUser();
            const supply = await Supply.create({ name: 'Ibuprofeno 400mg' });

            const res = await request(app)
                .get(`/api/supplies/${supply._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe('Ibuprofeno 400mg');
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .get('/api/supplies/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
            expect(res.body.error.code).toBe('RECURSO_NOT_FOUND');
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/supplies/000000000000000000000000');
            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/supplies', () => {
        it('returns 201 with created supply', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .post('/api/supplies')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Paracetamol 500mg' });
            expect(res.status).toBe(201);
            expect(res.body.data.name).toBe('Paracetamol 500mg');
        });

        it('returns 422 for missing required fields', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .post('/api/supplies')
                .set('Authorization', `Bearer ${token}`)
                .send({});
            expect(res.status).toBe(422);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('returns 401 without token', async () => {
            const res = await request(app)
                .post('/api/supplies')
                .send({ name: 'Paracetamol 500mg' });
            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/supplies/:id', () => {
        it('returns 200 with updated supply', async () => {
            const { token } = await createAuthenticatedUser();
            const supply = await Supply.create({ name: 'Ibuprofeno 400mg' });

            const res = await request(app)
                .patch(`/api/supplies/${supply._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Ibuprofeno 600mg' });
            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe('Ibuprofeno 600mg');
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .patch('/api/supplies/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'X' });
            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/supplies/snomed', () => {
        it('returns 400 without search param', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .get('/api/supplies/snomed')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(400);
        });

        it('returns 401 without token', async () => {
            const res = await request(app)
                .get('/api/supplies/snomed');
            expect(res.status).toBe(401);
        });
    });

    describe('DELETE /api/supplies/:id', () => {
        it('returns 204 on successful delete', async () => {
            const { token } = await createAuthenticatedUser();
            const supply = await Supply.create({ name: 'Ibuprofeno 400mg' });

            const res = await request(app)
                .delete(`/api/supplies/${supply._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(204);
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .delete('/api/supplies/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });

        it('returns 401 without token', async () => {
            const res = await request(app).delete('/api/supplies/000000000000000000000000');
            expect(res.status).toBe(401);
        });
    });
});
