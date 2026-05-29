import request from 'supertest';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createAuthenticatedUser } from '../../helpers/auth';
import { createApp } from '../../helpers/app';
import Professional from '../../../src/modules/professionals/professionals.model';

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

describe('Professionals Controller', () => {
    describe('GET /api/professionals', () => {
        it('returns 200 with empty list', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .get('/api/professionals')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('success');
            expect(res.body.data).toEqual([]);
        });

        it('returns 200 with professionals', async () => {
            const { token } = await createAuthenticatedUser();
            await Professional.create({ enrollment: 'MAT001', lastName: 'Gómez', firstName: 'Carlos' });

            const res = await request(app)
                .get('/api/professionals')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/professionals');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/professionals/dni/:dni', () => {
        it('returns 200 with matching professionals', async () => {
            const { token } = await createAuthenticatedUser();
            await Professional.create({ enrollment: 'MAT001', lastName: 'Gómez', firstName: 'Carlos', dni: '12345678' });

            const res = await request(app)
                .get('/api/professionals/dni/12345678')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/professionals/dni/12345678');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/professionals/:id', () => {
        it('returns 200 with professional', async () => {
            const { token } = await createAuthenticatedUser();
            const professional = await Professional.create({ enrollment: 'MAT001', lastName: 'Gómez', firstName: 'Carlos' });

            const res = await request(app)
                .get(`/api/professionals/${professional._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.data.enrollment).toBe('MAT001');
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .get('/api/professionals/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body.error.code).toBe('RECURSO_NOT_FOUND');
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/professionals/000000000000000000000000');
            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/professionals', () => {
        it('returns 201 with created professional', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .post('/api/professionals')
                .set('Authorization', `Bearer ${token}`)
                .send({ enrollment: 'MAT001', lastName: 'Gómez', firstName: 'Carlos' });

            expect(res.status).toBe(201);
            expect(res.body.data.enrollment).toBe('MAT001');
        });

        it('returns 422 for missing required fields', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .post('/api/professionals')
                .set('Authorization', `Bearer ${token}`)
                .send({ enrollment: 'MAT001' });

            expect(res.status).toBe(422);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('returns 401 without token', async () => {
            const res = await request(app)
                .post('/api/professionals')
                .send({ enrollment: 'MAT001', lastName: 'Gómez', firstName: 'Carlos' });

            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/professionals/:id', () => {
        it('returns 200 with updated professional', async () => {
            const { token } = await createAuthenticatedUser();
            const professional = await Professional.create({ enrollment: 'MAT001', lastName: 'Gómez', firstName: 'Carlos' });

            const res = await request(app)
                .patch(`/api/professionals/${professional._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ firstName: 'Carlos Alberto' });

            expect(res.status).toBe(200);
            expect(res.body.data.firstName).toBe('Carlos Alberto');
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .patch('/api/professionals/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`)
                .send({ firstName: 'X' });

            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/professionals/:id', () => {
        it('returns 204 on successful delete', async () => {
            const { token } = await createAuthenticatedUser();
            const professional = await Professional.create({ enrollment: 'MAT001', lastName: 'Gómez', firstName: 'Carlos' });

            const res = await request(app)
                .delete(`/api/professionals/${professional._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(204);
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .delete('/api/professionals/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        it('returns 401 without token', async () => {
            const res = await request(app).delete('/api/professionals/000000000000000000000000');
            expect(res.status).toBe(401);
        });
    });
});
