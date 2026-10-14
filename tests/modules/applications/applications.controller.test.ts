import request from 'supertest';
import { connectTestDB, clearCollections } from '../../helpers/db';
import { createAuthenticatedUser } from '../../helpers/auth';
import { createApp } from '../../helpers/app';
import { ApplicationRepository } from '../../../src/modules/applications/applications.repository';

let app: ReturnType<typeof createApp>;
let repository: ApplicationRepository;

beforeAll(async () => {
    await connectTestDB();
    app = createApp();
    repository = new ApplicationRepository();
});

beforeEach(async () => {
    await clearCollections();
});

describe('POST /api/applications', () => {
    it('creates an application as admin', async () => {
        const { token } = await createAuthenticatedUser({ roleType: 'admin' });

        const res = await request(app)
            .post('/api/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'SIFAHO', permisos: ['prescription:read'] });

        expect(res.status).toBe(201);
        expect(res.body.data.nombre).toBe('SIFAHO');
        expect(res.body.data.activo).toBe(true);
    });

    it('rejects a non-admin user', async () => {
        const { token } = await createAuthenticatedUser({ roleType: 'professional' });

        const res = await request(app)
            .post('/api/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'SIFAHO' });

        expect(res.status).toBe(403);
    });

    it('returns 422 without nombre', async () => {
        const { token } = await createAuthenticatedUser({ roleType: 'admin' });

        const res = await request(app)
            .post('/api/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(422);
    });
});

describe('POST /api/applications/:id/token', () => {
    it('issues a token for an active application', async () => {
        const { token } = await createAuthenticatedUser({ roleType: 'admin' });
        const application = await repository.create({ nombre: 'ANDES', permisos: ['prescription:create'] });

        const res = await request(app)
            .post(`/api/applications/${application._id}/token`)
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(200);
        expect(res.body.data.jwt).toBeDefined();
        expect(res.body.data.nombre).toBe('ANDES');
    });

    it('returns 404 for a non-existent application', async () => {
        const { token } = await createAuthenticatedUser({ roleType: 'admin' });

        const res = await request(app)
            .post('/api/applications/64f000000000000000000000/token')
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(404);
    });

    it('returns 409 for an inactive application', async () => {
        const { token } = await createAuthenticatedUser({ roleType: 'admin' });
        const application = await repository.create({ nombre: 'OLD' });
        await repository.updateActive(application._id.toString(), false);

        const res = await request(app)
            .post(`/api/applications/${application._id}/token`)
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(409);
    });
});
