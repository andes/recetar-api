import request from 'supertest';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createUser, createRole } from '../../helpers/factories';
import { createAuthenticatedUser } from '../../helpers/auth';
import { createApp } from '../../helpers/app';
import User from '../../../src/models/user.model';

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

describe('Users Controller', () => {
    describe('GET /api/users', () => {
        it('returns 200 with users list', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.total).toBe(1);
        });

        it('returns 200 filtered by searchTerm', async () => {
            const { token } = await createAuthenticatedUser();
            await createUser({ username: 'juan', email: 'juan@test.com' });
            await createUser({ username: 'pedro', email: 'pedro@test.com' });

            const res = await request(app)
                .get('/api/users?searchTerm=juan')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.items[0].username).toBe('juan');
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/users');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/users/:id', () => {
        it('returns 200 with user', async () => {
            const { token, user } = await createAuthenticatedUser();
            const res = await request(app)
                .get(`/api/users/${user._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.username).toBe('testuser');
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .get('/api/users/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });

        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/users/000000000000000000000000');
            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/users', () => {
        it('returns 201 with created user', async () => {
            const { token } = await createAuthenticatedUser();
            const role = await createRole('professional');
            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    password: 'password123',
                    roles: [role._id.toString()],
                    email: 'new@test.com',
                    username: 'newuser',
                    businessName: 'New User',
                });
            expect(res.status).toBe(201);
            expect(res.body.data.username).toBe('newuser');
        });

        it('returns 422 for missing required fields', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${token}`)
                .send({});
            expect(res.status).toBe(422);
        });

        it('returns 401 without token', async () => {
            const res = await request(app)
                .post('/api/users')
                .send({ password: 'password123', roles: [] });
            expect(res.status).toBe(401);
        });
    });

    describe('PATCH /api/users/:id', () => {
        it('returns 200 with updated user', async () => {
            const { token } = await createAuthenticatedUser();
            const target = await createUser({ username: 'target', email: 'target@test.com' });

            const res = await request(app)
                .patch(`/api/users/${target._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ businessName: 'Updated Name' });
            expect(res.status).toBe(200);
            expect(res.body.data.businessName).toBe('Updated Name');
        });

        it('returns 404 for non-existent id', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .patch('/api/users/000000000000000000000000')
                .set('Authorization', `Bearer ${token}`)
                .send({ businessName: 'X' });
            expect(res.status).toBe(404);
        });

        it('returns 401 without token', async () => {
            const res = await request(app)
                .patch('/api/users/000000000000000000000000')
                .send({ businessName: 'X' });
            expect(res.status).toBe(401);
        });
    });

    describe('PATCH /api/users/me/organizaciones', () => {
        it('returns 200 with updated organizaciones', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .patch('/api/users/me/organizaciones')
                .set('Authorization', `Bearer ${token}`)
                .send({ organizaciones: [{ nombre: 'Hospital Central' }] });
            expect(res.status).toBe(200);
            expect(res.body.data.organizaciones[0].nombre).toBe('Hospital Central');
        });

        it('returns 422 for missing organizaciones', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .patch('/api/users/me/organizaciones')
                .set('Authorization', `Bearer ${token}`)
                .send({});
            expect(res.status).toBe(422);
        });

        it('returns 401 without token', async () => {
            const res = await request(app)
                .patch('/api/users/me/organizaciones')
                .send({ organizaciones: [{ nombre: 'X' }] });
            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/users/request-email-update', () => {
        it('returns 200 with message', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .post('/api/users/request-email-update')
                .set('Authorization', `Bearer ${token}`)
                .send({ email: 'new@test.com' });
            expect(res.status).toBe(200);
            expect(res.body.data.message).toBeDefined();
        });

        it('returns 422 for missing email', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .post('/api/users/request-email-update')
                .set('Authorization', `Bearer ${token}`)
                .send({});
            expect(res.status).toBe(422);
        });

        it('returns 401 without token', async () => {
            const res = await request(app)
                .post('/api/users/request-email-update')
                .send({ email: 'new@test.com' });
            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/users/confirm-email-update', () => {
        it('returns 200 with message', async () => {
            const { token, user } = await createAuthenticatedUser();
            await request(app)
                .post('/api/users/request-email-update')
                .set('Authorization', `Bearer ${token}`)
                .send({ email: 'new@test.com' });

            const updated = await User.findById(user._id);
            const res = await request(app)
                .post('/api/users/confirm-email-update')
                .send({ token: updated!.emailConfirmationToken });
            expect(res.status).toBe(200);
            expect(res.body.data.message).toBeDefined();
        });

        it('returns 422 for invalid token', async () => {
            const res = await request(app)
                .post('/api/users/confirm-email-update')
                .send({ token: 'invalid' });
            expect(res.status).toBe(422);
        });
    });

    describe('GET /api/users/organizaciones-andes', () => {
        it('returns 400 without nombre param', async () => {
            const { token } = await createAuthenticatedUser();
            const res = await request(app)
                .get('/api/users/organizaciones-andes')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(400);
        });

        it('returns 401 without token', async () => {
            const res = await request(app)
                .get('/api/users/organizaciones-andes');
            expect(res.status).toBe(401);
        });
    });
});
