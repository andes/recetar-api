import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createUser } from '../../helpers/factories';
import { AuthRepository } from '../../../src/modules/auth/auth.repository';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { InvalidCredentialsError, UserNotFoundError } from '../../../src/modules/auth/auth.errors';

jest.setTimeout(15000);

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

let repository: AuthRepository;
let service: AuthService;

beforeAll(async () => {
    await connectTestDB();
    repository = new AuthRepository();
    service = new AuthService(repository, logger as any);
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

describe('AuthService', () => {
    describe('login', () => {
        it('returns jwt and refreshToken for valid credentials', async () => {
            await createUser({ username: 'loginuser', email: 'login@test.com' });

            const result = await service.login({ identifier: 'loginuser', password: 'password123' });

            expect(result).toHaveProperty('jwt');
            expect(result).toHaveProperty('refreshToken');
            expect(typeof result.jwt).toBe('string');
            expect(result.jwt.split('.')).toHaveLength(3);
        });

        it('throws InvalidCredentialsError for wrong password', async () => {
            await createUser({ username: 'wrongpass', email: 'wrong@test.com' });

            await expect(
                service.login({ identifier: 'wrongpass', password: 'wrongpassword' }),
            ).rejects.toThrow(InvalidCredentialsError);
        });

        it('throws InvalidCredentialsError for inactive user', async () => {
            await createUser({ username: 'inactive', email: 'inactive@test.com', isActive: false });

            await expect(
                service.login({ identifier: 'inactive', password: 'password123' }),
            ).rejects.toThrow(InvalidCredentialsError);
        });

        it('throws InvalidCredentialsError for non-existent user', async () => {
            await expect(
                service.login({ identifier: 'nobody', password: 'password123' }),
            ).rejects.toThrow(InvalidCredentialsError);
        });
    });

    describe('loginWithJwt', () => {
        it('returns tokens for valid user', async () => {
            const user = await createUser({ username: 'jwtuser', email: 'jwt@test.com' });

            const result = await service.loginWithJwt(user._id.toString());

            expect(result).toHaveProperty('jwt');
            expect(result).toHaveProperty('refreshToken');
        });

        it('throws UserNotFoundError for non-existent user', async () => {
            await expect(
                service.loginWithJwt('000000000000000000000000'),
            ).rejects.toThrow(UserNotFoundError);
        });
    });

    describe('logout', () => {
        it('clears refresh token', async () => {
            await createUser({ username: 'logoutuser', email: 'logout@test.com' });

            const loginResult = await service.login({ identifier: 'logoutuser', password: 'password123' });
            await service.logout(loginResult.refreshToken);

            await expect(
                service.refresh({ refreshToken: loginResult.refreshToken }),
            ).rejects.toThrow(InvalidCredentialsError);
        });
    });

    describe('refresh', () => {
        it('returns new tokens for valid refresh token', async () => {
            await createUser({ username: 'refreshuser', email: 'refresh@test.com' });

            const loginResult = await service.login({ identifier: 'refreshuser', password: 'password123' });
            const result = await service.refresh({ refreshToken: loginResult.refreshToken });

            expect(result).toHaveProperty('jwt');
            expect(result).toHaveProperty('refreshToken');
            expect(result.refreshToken).not.toBe(loginResult.refreshToken);
        });

        it('throws InvalidCredentialsError for invalid refresh token', async () => {
            await expect(
                service.refresh({ refreshToken: 'invalid-token' }),
            ).rejects.toThrow(InvalidCredentialsError);
        });
    });

    describe('getToken', () => {
        it('returns a jwt for existing user', async () => {
            await createUser({ username: 'tokenuser', email: 'token@test.com' });

            const result = await service.getToken({ username: 'tokenuser' });

            expect(result).toHaveProperty('jwt');
        });

        it('throws UserNotFoundError for non-existent user', async () => {
            await expect(
                service.getToken({ username: 'nobody' }),
            ).rejects.toThrow(UserNotFoundError);
        });
    });
});
