import request from 'supertest';
import { connectTestDB, clearCollections } from '../../helpers/db';
import { createAuthenticatedUser } from '../../helpers/auth';
import { createApp } from '../../helpers/app';

let app: ReturnType<typeof createApp>;

beforeAll(async () => {
    await connectTestDB();
    app = createApp();
});

beforeEach(async () => {
    await clearCollections();
});

describe('RBAC en rutas', () => {
    it('responde 401 sin token', async () => {
        const res = await request(app).get('/api/users');
        expect(res.status).toBe(401);
    });

    it('responde 403 cuando el rol no tiene el permiso (pharmacist no crea recetas)', async () => {
        const { token } = await createAuthenticatedUser({ roleType: 'pharmacist' });

        const res = await request(app)
            .post('/api/prescriptions')
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(403);
    });

    it('permite al admin listar usuarios', async () => {
        const { token } = await createAuthenticatedUser({ roleType: 'admin' });

        const res = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
    });

    it('responde 403 cuando un professional intenta listar usuarios', async () => {
        const { token } = await createAuthenticatedUser({ roleType: 'professional' });

        const res = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
    });

    it('responde 403 cuando un professional intenta crear un insumo', async () => {
        const { token } = await createAuthenticatedUser({ roleType: 'professional' });

        const res = await request(app)
            .post('/api/supplies')
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(403);
    });

    it('permite al professional crear una receta (permiso create:any)', async () => {
        const { token } = await createAuthenticatedUser({ roleType: 'professional' });

        const res = await request(app)
            .post('/api/prescriptions')
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).not.toBe(403);
    });
});
