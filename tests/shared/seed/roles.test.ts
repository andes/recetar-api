import { connectTestDB, clearCollections } from '../../helpers/db';
import Role from '../../../src/models/role.model';
import { seedRoles, ROLE_NAMES } from '../../../src/shared/seed/roles';

beforeAll(async () => {
    await connectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

describe('seedRoles', () => {
    it('creates all system roles', async () => {
        await seedRoles();

        const count = await Role.countDocuments({ role: { $in: [...ROLE_NAMES] } });
        expect(count).toBe(ROLE_NAMES.length);
    });

    it('is idempotent and does not duplicate roles', async () => {
        await seedRoles();
        await seedRoles();

        const count = await Role.countDocuments({ role: { $in: [...ROLE_NAMES] } });
        expect(count).toBe(ROLE_NAMES.length);
    });
});
