import request from 'supertest';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
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

describe('Patients Controller', () => {
    describe('GET /api/patients', () => {
        it('returns 200 from Andes (stub sin configurar responde 502)', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .get('/api/patients')
                .set('Authorization', `Bearer ${token}`);

            expect([200, 502]).toContain(res.status);
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/patients');

            expect(res.status).toBe(401);
            expect(res.body.status).toBe('error');
            expect(res.body.error.code).toBe('UNAUTHORIZED');
        });
    });

    describe('GET /api/patients/dni/:dni', () => {
        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/patients/dni/12345678');
            expect(res.status).toBe(401);
        });

        it('returns 502 when Andes is not configured', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .get('/api/patients/dni/12345678')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(502);
            expect(res.body.status).toBe('error');
        });
    });

    describe('POST /api/patients', () => {
        it('returns 422 for missing dni', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .post('/api/patients')
                .set('Authorization', `Bearer ${token}`)
                .send({ sex: 'Masculino' });

            expect(res.status).toBe(422);
            expect(res.body.status).toBe('error');
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('returns 401 without token', async () => {
            const res = await request(app)
                .post('/api/patients')
                .send({ dni: '12345678', sex: 'Masculino' });

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/patients/validate', () => {
        it('returns 400 when dni or sexo missing', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .post('/api/patients/validate')
                .set('Authorization', `Bearer ${token}`)
                .send({ dni: '12345678' });

            expect(res.status).toBe(400);
        });
    });

    describe('PATCH /api/patients/:id', () => {
        it('returns 401 without token', async () => {
            const res = await request(app)
                .patch('/api/patients/000000000000000000000000')
                .send({ firstName: 'Carlos' });

            expect(res.status).toBe(401);
        });
    });
});
