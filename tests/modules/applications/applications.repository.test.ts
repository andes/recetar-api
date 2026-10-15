import { connectTestDB, clearCollections } from '../../helpers/db';
import { ApplicationRepository } from '../../../src/modules/applications/applications.repository';
import { ApplicationNotFoundError } from '../../../src/modules/applications/applications.errors';

let repository: ApplicationRepository;

beforeAll(async () => {
    await connectTestDB();
    repository = new ApplicationRepository();
});

beforeEach(async () => {
    await clearCollections();
});

describe('ApplicationRepository', () => {
    it('creates an application with the given fields', async () => {
        const app = await repository.create({
            nombre: 'SIFAHO',
            organizacion: { _id: 'org-1', nombre: 'Obra Social' },
            permisos: ['prescription:read'],
        });

        expect(app._id).toBeDefined();
        expect(app.nombre).toBe('SIFAHO');
        expect(app.activo).toBe(true);
        expect([...app.permisos]).toEqual(['prescription:read']);
        expect(app.token).toBe('');
    });

    it('finds an application by id', async () => {
        const created = await repository.create({ nombre: 'ANDES' });

        const found = await repository.findById(created._id.toString());

        expect(found).not.toBeNull();
        expect(found?.nombre).toBe('ANDES');
    });

    it('returns null when the application does not exist', async () => {
        const found = await repository.findById('64f000000000000000000000');
        expect(found).toBeNull();
    });

    it('updates the stored token', async () => {
        const created = await repository.create({ nombre: 'PRAXIS' });

        const updated = await repository.updateToken(created._id.toString(), 'token-123');

        expect(updated?.token).toBe('token-123');
    });

    it('updates the active flag', async () => {
        const created = await repository.create({ nombre: 'PRAXIS' });

        const updated = await repository.updateActive(created._id.toString(), false);

        expect(updated?.activo).toBe(false);
    });

    it('finds an application by name', async () => {
        await repository.create({ nombre: 'SIFAHO' });

        const found = await repository.findByName('SIFAHO');

        expect(found?.nombre).toBe('SIFAHO');
    });

    it('throws when instantiating errors used by the module', () => {
        expect(new ApplicationNotFoundError().statusCode).toBe(404);
    });
});
