import request from 'supertest';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createAuthenticatedUser } from '../../helpers/auth';
import { createApp } from '../../helpers/app';
import Certificate from '../../../src/modules/certificates/certificates.model';

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

describe('Certificates Controller', () => {
    const certificateData = {
        patient: {
            firstName: 'Juan',
            lastName: 'Perez',
            dni: '12345678',
            sex: 'Masculino',
        },
        professional: {
            userId: '000000000000000000000001',
            businessName: 'Dr. Gomez',
        },
        startDate: '2025-01-15',
        cantDias: 10,
    };

    describe('GET /api/certificates', () => {
        it('returns 200 with empty list', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app).get('/api/certificates').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.certificates).toEqual([]);
            expect(res.body.data.total).toBe(0);
        });

        it('returns 200 with certificates', async () => {
            const { token } = await createAuthenticatedUser();
            await Certificate.create(certificateData);

            const res = await request(app).get('/api/certificates').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.certificates).toHaveLength(1);
            expect(res.body.data.total).toBe(1);
        });

        it('returns 200 with certificates filtered by userId', async () => {
            const { token } = await createAuthenticatedUser();
            await Certificate.create(certificateData);

            const res = await request(app)
                .get('/api/certificates?userId=000000000000000000000001')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.certificates).toHaveLength(1);
        });

        it('returns 200 with certificates filtered by userId and searchTerm', async () => {
            const { token } = await createAuthenticatedUser();
            await Certificate.create(certificateData);

            const res = await request(app)
                .get('/api/certificates?userId=000000000000000000000001&searchTerm=Juan')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.certificates).toHaveLength(1);
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/certificates');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/certificates/:id', () => {
        it('returns 200 with certificate', async () => {
            const { token } = await createAuthenticatedUser();
            const certificate = await Certificate.create(certificateData);

            const res = await request(app)
                .get(`/api/certificates/${certificate._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.patient.firstName).toBe('Juan');
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .get('/api/certificates/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
            expect(res.body.error.code).toBe('RECURSO_NOT_FOUND');
        });

        it('returns 404 without token (public route)', async () => {
            const res = await request(app).get('/api/certificates/000000000000000000000000');
            expect(res.status).toBe(404);
        });
    });

    describe('POST /api/certificates', () => {
        it('returns 201 with created certificate', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .post('/api/certificates')
                .set('Authorization', `Bearer ${token}`)
                .send(certificateData);
            expect(res.status).toBe(201);
            expect(res.body.data.patient.firstName).toBe('Juan');
            expect(res.body.data.cantDias).toBe(10);
        });

        it('returns 422 for missing required fields', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .post('/api/certificates')
                .set('Authorization', `Bearer ${token}`)
                .send({});
            expect(res.status).toBe(422);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('returns 401 without token', async () => {
            const res = await request(app)
                .post('/api/certificates')
                .send(certificateData);
            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/certificates/:id', () => {
        it('returns 200 with anulated certificate', async () => {
            const { token } = await createAuthenticatedUser();
            const certificate = await Certificate.create(certificateData);

            const res = await request(app)
                .patch(`/api/certificates/${certificate._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ anulateReason: 'Error médico' });
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('anulado');
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .patch('/api/certificates/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`)
                .send({ anulateReason: 'X' });
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/certificates/:id', () => {
        it('returns 204 on successful delete', async () => {
            const { token } = await createAuthenticatedUser();
            const certificate = await Certificate.create(certificateData);

            const res = await request(app)
                .delete(`/api/certificates/${certificate._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(204);
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .delete('/api/certificates/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });

        it('returns 401 without token', async () => {
            const res = await request(app).delete('/api/certificates/000000000000000000000000');
            expect(res.status).toBe(401);
        });
    });
});
