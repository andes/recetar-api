import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createUser, createRole } from '../../helpers/factories';
import { UsersRepository } from '../../../src/modules/users/users.repository';
import { UsersService } from '../../../src/modules/users/users.service';
import { AndesClient } from '../../../src/integrations/andes';
import {
    UserNotFoundError,
    UserNotActiveError,
    EmailAlreadyTakenError,
    UsernameAlreadyTakenError,
    InvalidEmailTokenError,
    RoleNotFoundError,
} from '../../../src/modules/users/users.errors';
import User from '../../../src/models/user.model';

jest.setTimeout(15000);

let repository: UsersRepository;
let service: UsersService;
const andesClient = new AndesClient();

beforeAll(async () => {
    await connectTestDB();
    repository = new UsersRepository();
    service = new UsersService(repository, andesClient);
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

describe('UsersService', () => {
    describe('index', () => {
        it('returns empty result when no users', async () => {
            const result = await service.index({});
            expect(result.items).toEqual([]);
            expect(result.total).toBe(0);
        });

        it('returns paginated users', async () => {
            await createUser({ username: 'user1', email: 'user1@test.com' });
            await createUser({ username: 'user2', email: 'user2@test.com' });

            const result = await service.index({ offset: 0, limit: 1 });
            expect(result.items).toHaveLength(1);
            expect(result.total).toBe(2);
        });

        it('filters by searchTerm', async () => {
            await createUser({ username: 'juan', email: 'juan@test.com' });
            await createUser({ username: 'pedro', email: 'pedro@test.com' });

            const result = await service.index({ searchTerm: 'juan' });
            expect(result.items).toHaveLength(1);
            expect(result.items[0].username).toBe('juan');
        });
    });

    describe('getById', () => {
        it('returns user by id', async () => {
            const created = await createUser({ username: 'testuser' });
            const user = created.toObject();
            const result = await service.getById(user._id.toString());
            expect(result.username).toBe('testuser');
        });

        it('throws UserNotFoundError for non-existent id', async () => {
            await expect(service.getById('000000000000000000000000')).rejects.toThrow(UserNotFoundError);
        });

        it('throws UserNotActiveError for inactive user', async () => {
            const created = await createUser({ username: 'inactive', isActive: false });
            const user = created.toObject();
            await expect(service.getById(user._id.toString())).rejects.toThrow(UserNotActiveError);
        });
    });

    describe('create', () => {
        const creator = { _id: '000000000000000000000001' } as any;

        it('creates a user', async () => {
            const role = await createRole('professional');
            const result = await service.create({
                password: 'password123',
                roles: [role._id.toString()],
                email: 'new@test.com',
                username: 'newuser',
                businessName: 'New User',
            }, creator);

            expect(result).toBeDefined();
            expect((result as any).username).toBe('newuser');
        });

        it('throws EmailAlreadyTakenError for duplicate email', async () => {
            const role = await createRole('professional');
            await createUser({ email: 'exists@test.com' });

            await expect(service.create({
                password: 'password123',
                roles: [role._id.toString()],
                email: 'exists@test.com',
                username: 'other',
            }, creator)).rejects.toThrow(EmailAlreadyTakenError);
        });

        it('throws UsernameAlreadyTakenError for duplicate username', async () => {
            const role = await createRole('professional');
            await createUser({ username: 'taken' });

            await expect(service.create({
                password: 'password123',
                roles: [role._id.toString()],
                username: 'taken',
            }, creator)).rejects.toThrow(UsernameAlreadyTakenError);
        });

        it('throws RoleNotFoundError for invalid role IDs', async () => {
            await expect(service.create({
                password: 'password123',
                roles: ['000000000000000000000000'],
            }, creator)).rejects.toThrow(RoleNotFoundError);
        });
    });

    describe('update', () => {
        it('updates user fields', async () => {
            const role = await createRole('professional');
            const created = await createUser({ username: 'oldname', roles: [role._id] });
            const userId = created._id.toString();

            const result = await service.update(userId, { businessName: 'New Name' }, { _id: created._id } as any);
            expect((result as any).businessName).toBe('New Name');
        });

        it('activates inactive user', async () => {
            const created = await createUser({ username: 'inactive', isActive: false });
            const userId = created._id.toString();

            await service.update(userId, { isActive: true }, { _id: created._id } as any);
            const updated = await User.findById(userId);
            expect(updated?.isActive).toBe(true);
        });

        it('throws UserNotFoundError for non-existent id', async () => {
            await expect(service.update('000000000000000000000000', { businessName: 'X' }, {} as any)).rejects.toThrow(UserNotFoundError);
        });

        it('throws EmailAlreadyTakenError for existing email', async () => {
            await createUser({ username: 'user1', email: 'user1@test.com' });
            const target = await createUser({ username: 'target', email: 'target@test.com' });

            await expect(service.update(target._id.toString(), { email: 'user1@test.com' }, {} as any)).rejects.toThrow(EmailAlreadyTakenError);
        });
    });

    describe('updateOwnOrganizaciones', () => {
        it('updates organizaciones', async () => {
            const created = await createUser({ username: 'testuser' });
            const userId = created._id.toString();

            const result = await service.updateOwnOrganizaciones(userId, [
                { nombre: 'Hospital Central' },
            ]);
            const user = (result as any).toObject ? (result as any).toObject() : result;
            expect(user.organizaciones[0].nombre).toBe('Hospital Central');
        });

        it('throws UserNotFoundError for non-existent id', async () => {
            await expect(service.updateOwnOrganizaciones('000000000000000000000000', [])).rejects.toThrow(UserNotFoundError);
        });
    });

    describe('requestEmailUpdate', () => {
        it('sets pending email and token', async () => {
            const created = await createUser({ username: 'testuser', email: 'old@test.com' });
            const userId = created._id.toString();

            const result = await service.requestEmailUpdate(userId, 'new@test.com');
            expect(result).toEqual({ message: expect.any(String) });

            const updated = await User.findById(userId);
            expect(updated?.pendingEmail).toBe('new@test.com');
            expect(updated?.emailConfirmationToken).toBeDefined();
            expect(updated?.emailConfirmationExpires).toBeDefined();
        });

        it('throws EmailAlreadyTakenError for existing email', async () => {
            await createUser({ username: 'other', email: 'taken@test.com' });
            const created = await createUser({ username: 'testuser', email: 'old@test.com' });

            await expect(service.requestEmailUpdate(created._id.toString(), 'taken@test.com')).rejects.toThrow(EmailAlreadyTakenError);
        });

        it('throws UserNotFoundError for non-existent user', async () => {
            await expect(service.requestEmailUpdate('000000000000000000000000', 'new@test.com')).rejects.toThrow(UserNotFoundError);
        });
    });

    describe('confirmEmailUpdate', () => {
        it('confirms email with valid token', async () => {
            const created = await createUser({ username: 'testuser', email: 'old@test.com' });
            const userId = created._id.toString();

            await service.requestEmailUpdate(userId, 'new@test.com');
            const user = await User.findById(userId);

            const result = await service.confirmEmailUpdate(user!.emailConfirmationToken!);
            expect(result).toEqual({ message: expect.any(String) });

            const updated = await User.findById(userId);
            expect(updated?.email).toBe('new@test.com');
            expect(updated?.pendingEmail).toBeUndefined();
            expect(updated?.emailConfirmationToken).toBeUndefined();
        });

        it('throws InvalidEmailTokenError for invalid token', async () => {
            await expect(service.confirmEmailUpdate('invalid-token')).rejects.toThrow(InvalidEmailTokenError);
        });
    });
});
