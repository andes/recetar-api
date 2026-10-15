import request from 'supertest';
import { connectTestDB, clearCollections } from '../../helpers/db';
import { createApp } from '../../helpers/app';
import { ApplicationRepository } from '../../../src/modules/applications/applications.repository';
import { ApplicationService } from '../../../src/modules/applications/applications.service';
import { requireAppPermission } from '../../../src/shared/middlewares/app-auth.middleware';
import { ForbiddenError } from '../../../src/shared/errors';

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

let app: ReturnType<typeof createApp>;
let repository: ApplicationRepository;
let service: ApplicationService;

beforeAll(async () => {
    await connectTestDB();
    app = createApp();
    repository = new ApplicationRepository();
    service = new ApplicationService(repository, logger as any);
});

beforeEach(async () => {
    await clearCollections();
});

describe('checkAppAuth (GET /api/applications/me)', () => {
    it('accepts a valid application token', async () => {
        const application = await service.create({ nombre: 'SIFAHO', permisos: ['prescription:read'] });
        const { jwt } = await service.issueToken(application._id.toString());

        const res = await request(app)
            .get('/api/applications/me')
            .set('Authorization', `Bearer ${jwt}`);

        expect(res.status).toBe(200);
        expect(res.body.data.app.nombre).toBe('SIFAHO');
        expect(res.body.data.permisos).toEqual(['prescription:read']);
    });

    it('rejects a request without token', async () => {
        const res = await request(app).get('/api/applications/me');
        expect(res.status).toBe(401);
    });

    it('rejects the old token after re-issuing (revocation)', async () => {
        const application = await service.create({ nombre: 'SIFAHO' });
        const first = await service.issueToken(application._id.toString());
        const second = await service.issueToken(application._id.toString());

        const oldRes = await request(app).get('/api/applications/me').set('Authorization', `Bearer ${first.jwt}`);
        const newRes = await request(app).get('/api/applications/me').set('Authorization', `Bearer ${second.jwt}`);

        expect(oldRes.status).toBe(401);
        expect(newRes.status).toBe(200);
    });

    it('rejects when the application is inactive', async () => {
        const application = await service.create({ nombre: 'OLD' });
        const { jwt } = await service.issueToken(application._id.toString());
        await repository.updateActive(application._id.toString(), false);

        const res = await request(app)
            .get('/api/applications/me')
            .set('Authorization', `Bearer ${jwt}`);

        expect(res.status).toBe(401);
    });
});

describe('requireAppPermission', () => {
    const run = (req: Record<string, unknown>, permission: string): Promise<unknown> => {
        return new Promise((resolve) => {
            requireAppPermission(permission)(req as any, {} as any, (err?: unknown) => resolve(err));
        });
    };

    it('allows when permisos include the permission', async () => {
        const err = await run({ user: { permisos: ['prescription:read'] } }, 'prescription:read');
        expect(err).toBeUndefined();
    });

    it('allows a resource wildcard', async () => {
        const err = await run({ user: { permisos: ['prescription:*'] } }, 'prescription:create');
        expect(err).toBeUndefined();
    });

    it('denies when the permission is missing', async () => {
        const err = await run({ user: { permisos: ['patient:read'] } }, 'prescription:create');
        expect(err).toBeInstanceOf(ForbiddenError);
    });

    it('denies when there is no principal', async () => {
        const err = await run({}, 'prescription:read');
        expect(err).toBeInstanceOf(ForbiddenError);
    });
});
