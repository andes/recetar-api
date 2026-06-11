import request from 'supertest';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createUser } from '../../helpers/factories';
import { createAuthenticatedUser } from '../../helpers/auth';
import { createApp } from '../../helpers/app';

jest.mock('../../../src/integrations/andes', () => {
    const actual = jest.requireActual('../../../src/integrations/andes');
    const mockAndesClient = {
        getProfessionalByDocumento: jest.fn(),
        getPharmacyByCuit: jest.fn(),
    };
    return {
        ...actual,
        AndesClient: jest.fn().mockImplementation(() => mockAndesClient),
        mockAndesClient,
    };
});

const { mockAndesClient } = jest.requireMock('../../../src/integrations/andes') as {
    mockAndesClient: { getProfessionalByDocumento: jest.Mock; getPharmacyByCuit: jest.Mock };
};

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
    mockAndesClient.getProfessionalByDocumento.mockReset();
    mockAndesClient.getPharmacyByCuit.mockReset();
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

    describe('GET /api/auth/professionals-andes/matriculas', () => {
        const profesional = {
            id: 'prof1',
            documento: '30123456',
            nombre: 'Ana',
            apellido: 'Pérez',
            profesiones: [{
                profesion: { codigo: 1, nombre: 'Médico' },
                matriculado: true,
                matriculacion: [{ matriculaNumero: 222, inicio: '2020-01-01', fin: '2099-01-01T00:00:00.000Z' }],
            }],
        };

        it('returns 200 with estadoGeneral and matriculas', async () => {
            const { token } = await createAuthenticatedUser();
            mockAndesClient.getProfessionalByDocumento.mockResolvedValue(profesional);

            const res = await request(app)
                .get('/api/auth/professionals-andes/matriculas')
                .query({ documento: '30123456' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('success');
            expect(res.body.data.estadoGeneral).toBe('vigente');
            expect(res.body.data.matriculas).toHaveLength(1);
        });

        it('returns 404 when the professional is not found in Andes', async () => {
            const { token } = await createAuthenticatedUser();
            mockAndesClient.getProfessionalByDocumento.mockResolvedValue(null);

            const res = await request(app)
                .get('/api/auth/professionals-andes/matriculas')
                .query({ documento: '99999999' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body.error.code).toBe('RECURSO_NOT_FOUND');
        });

        it('returns 502 when Andes fails', async () => {
            const { token } = await createAuthenticatedUser();
            mockAndesClient.getProfessionalByDocumento.mockRejectedValue(new Error('andes down'));

            const res = await request(app)
                .get('/api/auth/professionals-andes/matriculas')
                .query({ documento: '30123456' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(502);
            expect(res.body.error.code).toBe('BAD_GATEWAY');
        });

        it('returns 422 when documento is missing', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .get('/api/auth/professionals-andes/matriculas')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(422);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('returns 401 without token', async () => {
            const res = await request(app)
                .get('/api/auth/professionals-andes/matriculas')
                .query({ documento: '30123456' });

            expect(res.status).toBe(401);
        });
    });
});
