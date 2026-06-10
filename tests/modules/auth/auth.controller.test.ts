import request from 'supertest';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createUser } from '../../helpers/factories';
import { createAuthenticatedUser } from '../../helpers/auth';
import { createApp } from '../../helpers/app';

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

describe('Auth Controller', () => {
    describe('POST /api/auth/login', () => {
        it('returns 200 with jwt and refreshToken', async () => {
            await createUser({ username: 'loginuser', email: 'login@test.com' });

            const res = await request(app)
                .post('/api/auth/login')
                .send({ identifier: 'loginuser', password: 'password123' });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('success');
            expect(res.body.data).toHaveProperty('jwt');
            expect(res.body.data).toHaveProperty('refreshToken');
        });

        it('returns 401 for invalid credentials', async () => {
            await createUser({ username: 'wronguser', email: 'wrong@test.com' });

            const res = await request(app)
                .post('/api/auth/login')
                .send({ identifier: 'wronguser', password: 'badpass' });

            expect(res.status).toBe(401);
            expect(res.body.status).toBe('error');
            expect(res.body.error.code).toBe('UNAUTHORIZED');
        });

        it('returns 422 for empty body', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({});

            expect(res.status).toBe(422);
            expect(res.body.status).toBe('error');
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
            expect(res.body.error.details).toBeDefined();
        });

        it('returns 422 for missing password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ identifier: 'test' });

            expect(res.status).toBe(422);
        });
    });

    describe('POST /api/auth/refresh', () => {
        it('returns 200 with new tokens', async () => {
            await createUser({ username: 'refreshuser', email: 'refresh@test.com' });

            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ identifier: 'refreshuser', password: 'password123' });

            const res = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: loginRes.body.data.refreshToken });

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('jwt');
        });

        it('returns 401 for invalid refresh token', async () => {
            const res = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'invalid' });

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/auth/logout', () => {
        it('returns 204 on successful logout', async () => {
            await createUser({ username: 'logoutuser', email: 'logout@test.com' });

            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ identifier: 'logoutuser', password: 'password123' });

            const res = await request(app)
                .post('/api/auth/logout')
                .send({ refreshToken: loginRes.body.data.refreshToken });

            expect(res.status).toBe(204);
        });
    });

    describe('GET /api/auth/jwt-login', () => {
        it('returns 200 with valid JWT', async () => {
            const { token } = await createAuthenticatedUser({ username: 'jwtuser', email: 'jwt@test.com' });

            const res = await request(app)
                .get('/api/auth/jwt-login')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('success');
            expect(res.body.data).toHaveProperty('jwt');
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/auth/jwt-login');

            expect(res.status).toBe(401);
            expect(res.body.status).toBe('error');
            expect(res.body.error.code).toBe('UNAUTHORIZED');
        });

        it('returns 401 with invalid token', async () => {
            const res = await request(app)
                .get('/api/auth/jwt-login')
                .set('Authorization', 'Bearer invalid-token');

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/auth/get-token', () => {
        it('returns 200 with JWT for existing user', async () => {
            await createUser({ username: 'tokenuser', email: 'token@test.com' });

            const res = await request(app)
                .post('/api/auth/get-token')
                .send({ username: 'tokenuser' });

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('jwt');
        });

        it('returns 404 for non-existent user', async () => {
            const res = await request(app)
                .post('/api/auth/get-token')
                .send({ username: 'nobody' });

            expect(res.status).toBe(404);
        });
    });
});
