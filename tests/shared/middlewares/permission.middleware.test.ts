import { hasPermission, requirePermission } from '../../../src/shared/middlewares/permission.middleware';
import { ForbiddenError } from '../../../src/shared/errors';

describe('hasPermission', () => {
    it('allows a professional to create a prescription', () => {
        expect(hasPermission(['professional'], 'create:any', 'prescription')).toBe(true);
    });

    it('denies a pharmacist from creating a prescription', () => {
        expect(hasPermission(['pharmacist'], 'create:any', 'prescription')).toBe(false);
    });

    it('allows a pharmacist to read prescriptions', () => {
        expect(hasPermission(['pharmacist'], 'read:any', 'prescription')).toBe(true);
    });

    it('allows an admin to read users', () => {
        expect(hasPermission(['admin'], 'read:any', 'user')).toBe(true);
    });

    it('respects the Own scope', () => {
        expect(hasPermission(['professional'], 'read:own', 'prescription')).toBe(true);
    });

    it('denies an action without grant', () => {
        expect(hasPermission(['professional'], 'delete:any', 'user')).toBe(false);
    });

    it('allows a professional to delete a patient', () => {
        expect(hasPermission(['professional'], 'delete:any', 'patient')).toBe(true);
    });

    it('allows an auditor to update and delete a patient', () => {
        expect(hasPermission(['auditor'], 'update:any', 'patient')).toBe(true);
        expect(hasPermission(['auditor'], 'delete:any', 'patient')).toBe(true);
    });

    it('denies when the user has no roles', () => {
        expect(hasPermission([], 'read:any', 'prescription')).toBe(false);
    });

    it('denies an unknown action', () => {
        expect(hasPermission(['admin'], 'approve:any', 'prescription')).toBe(false);
    });
});

describe('requirePermission', () => {
    const run = (req: Record<string, unknown>, action: string, resource: string): Promise<unknown> => {
        return new Promise((resolve) => {
            requirePermission(action, resource)(req as any, {} as any, (err?: unknown) => resolve(err));
        });
    };

    it('calls next without error when the role has the permission', async () => {
        const err = await run({ user: { roleNames: ['professional'] } }, 'create:any', 'prescription');
        expect(err).toBeUndefined();
    });

    it('calls next with ForbiddenError when the role lacks the permission', async () => {
        const err = await run({ user: { roleNames: ['pharmacist'] } }, 'create:any', 'prescription');
        expect(err).toBeInstanceOf(ForbiddenError);
    });

    it('calls next with ForbiddenError when there is no user', async () => {
        const err = await run({}, 'read:any', 'prescription');
        expect(err).toBeInstanceOf(ForbiddenError);
    });
});
