import request from 'supertest';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createAuthenticatedUser } from '../../helpers/auth';
import { createApp } from '../../helpers/app';
import Patient from '../../../src/modules/patients/patients.model';

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
        it('returns 200 with empty list', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .get('/api/patients')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('success');
            expect(res.body.data).toEqual([]);
        });

        it('returns 200 with patients', async () => {
            const { token } = await createAuthenticatedUser();
            await Patient.create({ dni: '12345678', firstName: 'Juan', lastName: 'Pérez', sex: 'Masculino' });

            const res = await request(app)
                .get('/api/patients')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].dni).toBe('12345678');
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/patients');

            expect(res.status).toBe(401);
            expect(res.body.status).toBe('error');
            expect(res.body.error.code).toBe('UNAUTHORIZED');
        });
    });

    describe('GET /api/patients/:id', () => {
        it('returns 200 with patient', async () => {
            const { token } = await createAuthenticatedUser();
            const patient = await Patient.create({ dni: '12345678', firstName: 'Juan', lastName: 'Pérez', sex: 'Masculino' });

            const res = await request(app)
                .get(`/api/patients/${patient._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.data.dni).toBe('12345678');
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .get('/api/patients/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body.status).toBe('error');
            expect(res.body.error.code).toBe('RECURSO_NOT_FOUND');
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/patients/000000000000000000000000');

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/patients/dni/:dni', () => {
        it('returns 200 with matching patients', async () => {
            const { token } = await createAuthenticatedUser();
            await Patient.create({ dni: '12345678', firstName: 'Juan', lastName: 'Pérez', sex: 'Masculino' });

            const res = await request(app)
                .get('/api/patients/dni/12345678')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].dni).toBe('12345678');
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/patients/dni/12345678');

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/patients', () => {
        it('returns 201 with created patient', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .post('/api/patients')
                .set('Authorization', `Bearer ${token}`)
                .send({ dni: '12345678', firstName: 'Juan', lastName: 'Pérez', sex: 'Masculino' });

            expect(res.status).toBe(201);
            expect(res.body.status).toBe('success');
            expect(res.body.data.dni).toBe('12345678');
        });

        it('returns 422 for missing required fields', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .post('/api/patients')
                .set('Authorization', `Bearer ${token}`)
                .send({ dni: '12345678' });

            expect(res.status).toBe(422);
            expect(res.body.status).toBe('error');
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('returns 401 without token', async () => {
            const res = await request(app)
                .post('/api/patients')
                .send({ dni: '12345678', firstName: 'Juan', lastName: 'Pérez', sex: 'Masculino' });

            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/patients/:id', () => {
        it('returns 200 with updated patient', async () => {
            const { token } = await createAuthenticatedUser();
            const patient = await Patient.create({ dni: '12345678', firstName: 'Juan', lastName: 'Pérez', sex: 'Masculino' });

            const res = await request(app)
                .patch(`/api/patients/${patient._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ firstName: 'Carlos' });

            expect(res.status).toBe(200);
            expect(res.body.data.firstName).toBe('Carlos');
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .patch('/api/patients/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`)
                .send({ firstName: 'Carlos' });

            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /api/patients/:id', () => {
        it('returns 200 with patched patient', async () => {
            const { token } = await createAuthenticatedUser();
            const patient = await Patient.create({ dni: '12345678', firstName: 'Juan', lastName: 'Pérez', sex: 'Masculino' });

            const res = await request(app)
                .patch(`/api/patients/${patient._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ firstName: 'Pedro', sex: 'Femenino' });

            expect(res.status).toBe(200);
            expect(res.body.data.firstName).toBe('Pedro');
            expect(res.body.data.sex).toBe('Femenino');
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();

            const res = await request(app)
                .patch('/api/patients/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`)
                .send({ firstName: 'Pedro' });

            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/patients/coverages', () => {
        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/patients/coverages');

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/patients/coverages/:dni', () => {
        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/patients/coverages/12345678');

            expect(res.status).toBe(401);
        });
    });
});
