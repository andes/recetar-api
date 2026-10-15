import { connectTestDB, clearCollections } from '../../helpers/db';
import { createAuthenticatedUser } from '../../helpers/auth';
import { checkAuth } from '../../../src/shared/middlewares/auth.middleware';
import { AuthError } from '../../../src/shared/errors';

const runCheckAuth = (req: Record<string, unknown>): Promise<unknown> => {
    return new Promise((resolve) => {
        checkAuth(req as any, {} as any, (err?: unknown) => resolve(err));
    });
};

beforeAll(async () => {
    await connectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

describe('checkAuth', () => {
    it('exposes the user and its role names on success', async () => {
        const { token } = await createAuthenticatedUser({ roleType: 'professional' });

        const req: any = { headers: { authorization: `Bearer ${token}` } };
        const err = await runCheckAuth(req);

        expect(err).toBeUndefined();
        expect(req.user).toBeDefined();
        expect(req.user.roleNames).toContain('professional');
    });

    it('fails with AuthError when the header is missing', async () => {
        const err = await runCheckAuth({ headers: {} });

        expect(err).toBeInstanceOf(AuthError);
    });

    it('fails with AuthError when the token is invalid', async () => {
        const err = await runCheckAuth({ headers: { authorization: 'Bearer not-a-token' } });

        expect(err).toBeInstanceOf(AuthError);
    });
});
