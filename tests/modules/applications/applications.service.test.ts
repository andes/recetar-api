import jwt from 'jsonwebtoken';
import { connectTestDB, clearCollections } from '../../helpers/db';
import { ApplicationRepository } from '../../../src/modules/applications/applications.repository';
import { ApplicationService, AppTokenPayload } from '../../../src/modules/applications/applications.service';
import { ApplicationNotFoundError, ApplicationInactiveError } from '../../../src/modules/applications/applications.errors';

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

let repository: ApplicationRepository;
let service: ApplicationService;

beforeAll(async () => {
    await connectTestDB();
    repository = new ApplicationRepository();
    service = new ApplicationService(repository, logger as any);
});

beforeEach(async () => {
    await clearCollections();
});

describe('ApplicationService', () => {
    describe('create', () => {
        it('creates an active application with permissions', async () => {
            const app = await service.create({
                nombre: 'SIFAHO',
                organizacion: { _id: 'org-1', nombre: 'Obra Social' },
                permisos: ['prescription:read'],
            });

            expect(app.activo).toBe(true);
            expect([...app.permisos]).toEqual(['prescription:read']);
        });
    });

    describe('issueToken', () => {
        it('issues a signed token with app identity and permissions', async () => {
            const app = await service.create({
                nombre: 'ANDES',
                organizacion: { _id: 'org-2', nombre: 'ANDES' },
                permisos: ['prescription:create'],
            });

            const issued = await service.issueToken(app._id.toString());

            const decoded = jwt.verify(issued.jwt, process.env.JWT_SECRET || '') as AppTokenPayload;
            expect(decoded.iss).toBe('recetar.andes');
            expect(decoded.app.id).toBe(app._id.toString());
            expect(decoded.app.nombre).toBe('ANDES');
            expect(decoded.permisos).toEqual(['prescription:create']);
            expect(decoded.isAppToken).toBe(true);
            expect(decoded.exp).toBeGreaterThan(decoded.iat);
        });

        it('uses the default expiry when not provided', async () => {
            const app = await service.create({ nombre: 'PRAXIS' });

            const issued = await service.issueToken(app._id.toString());

            expect(issued.expiresInHours).toBe(720);
        });

        it('honors a custom expiry', async () => {
            const app = await service.create({ nombre: 'PRAXIS' });

            const issued = await service.issueToken(app._id.toString(), { expiresInHours: 24 });

            expect(issued.expiresInHours).toBe(24);
        });

        it('stores the issued token as the current token', async () => {
            const app = await service.create({ nombre: 'PRAXIS' });

            const issued = await service.issueToken(app._id.toString());

            const stored = await repository.findById(app._id.toString());
            expect(stored?.token).toBe(issued.jwt);
        });

        it('throws ApplicationNotFoundError when the application does not exist', async () => {
            await expect(
                service.issueToken('64f000000000000000000000'),
            ).rejects.toThrow(ApplicationNotFoundError);
        });

        it('throws ApplicationInactiveError when the application is inactive', async () => {
            const app = await service.create({ nombre: 'SIFAHO' });
            await repository.updateActive(app._id.toString(), false);

            await expect(
                service.issueToken(app._id.toString()),
            ).rejects.toThrow(ApplicationInactiveError);
        });
    });
});
