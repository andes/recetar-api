import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createUser } from '../../helpers/factories';
import { AuthRepository } from '../../../src/modules/auth/auth.repository';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { InvalidCredentialsError, UserNotFoundError } from '../../../src/modules/auth/auth.errors';
import { AndesClient, AndesProfesionalDetalle, AndesFarmacia } from '../../../src/integrations/andes';

jest.setTimeout(15000);

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const futureDate = '2099-01-01T00:00:00.000Z';

function buildProfessional(): AndesProfesionalDetalle {
    return {
        id: 'prof1',
        documento: '30123456',
        nombre: 'Ana',
        apellido: 'Pérez',
        cuit: '27-30123456-3',
        profesiones: [{
            profesion: { codigo: 1, nombre: 'Médico' },
            matriculado: true,
            matriculacion: [{ matriculaNumero: 222, inicio: '2020-01-01', fin: futureDate }],
        }],
    };
}

class AndesClientStub {
    professional: AndesProfesionalDetalle | null = null;
    pharmacy: AndesFarmacia | null = null;
    shouldThrow = false;

    getProfessionalByDocumento = jest.fn(async (_documento: string): Promise<AndesProfesionalDetalle | null> => {
        if (this.shouldThrow) { throw new Error('andes down'); }
        return this.professional;
    });

    getPharmacyByCuit = jest.fn(async (_cuit: string): Promise<AndesFarmacia | null> => {
        if (this.shouldThrow) { throw new Error('andes down'); }
        return this.pharmacy;
    });
}

let repository: AuthRepository;
let service: AuthService;
const andesStub = new AndesClientStub();

beforeAll(async () => {
    await connectTestDB();
    repository = new AuthRepository();
    service = new AuthService(repository, logger as any, undefined, undefined, andesStub as unknown as AndesClient);
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
    andesStub.professional = null;
    andesStub.pharmacy = null;
    andesStub.shouldThrow = false;
    andesStub.getProfessionalByDocumento.mockClear();
    andesStub.getPharmacyByCuit.mockClear();
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

    describe('sincronización con Andes', () => {
        it('login sincroniza cuil, nombre/apellido, businessName y profesionGrado del profesional', async () => {
            await createUser({ username: '30123456', email: 'prof@test.com', businessName: '', profesionGrado: [] });
            andesStub.professional = buildProfessional();

            await service.login({ identifier: '30123456', password: 'password123' });

            const updated = await repository.findOneByUsername('30123456');
            expect(updated?.cuil).toBe('27-30123456-3');
            expect(updated?.firstName).toBe('Ana');
            expect(updated?.lastName).toBe('Pérez');
            expect(updated?.businessName).toBe('PÉREZ ANA');
            expect(updated?.profesionGrado?.[0]).toMatchObject({
                profesion: 'Médico',
                codigoProfesion: '1',
                numeroMatricula: '222',
                estado: 'vigente',
            });
            expect(andesStub.getProfessionalByDocumento).toHaveBeenCalledWith('30123456');
        });

        it('no sobreescribe businessName si ya tiene valor', async () => {
            await createUser({ username: '30123456', email: 'prof@test.com', businessName: 'EXISTENTE' });
            andesStub.professional = buildProfessional();

            await service.login({ identifier: '30123456', password: 'password123' });

            const updated = await repository.findOneByUsername('30123456');
            expect(updated?.businessName).toBe('EXISTENTE');
            expect(updated?.cuil).toBe('27-30123456-3');
        });

        it('loginWithJwt también sincroniza', async () => {
            const user = await createUser({ username: '30123456', email: 'prof@test.com', businessName: '' });
            andesStub.professional = buildProfessional();

            await service.loginWithJwt(user._id.toString());

            const updated = await repository.findOneByUsername('30123456');
            expect(updated?.firstName).toBe('Ana');
            expect(updated?.cuil).toBe('27-30123456-3');
        });

        it('si Andes falla, el login devuelve tokens y conserva los datos previos', async () => {
            await createUser({ username: '30123456', email: 'prof@test.com', businessName: '' });
            andesStub.shouldThrow = true;

            const result = await service.login({ identifier: '30123456', password: 'password123' });

            expect(result.jwt).toBeDefined();
            const updated = await repository.findOneByUsername('30123456');
            expect(updated?.cuil).toBeUndefined();
        });

        it('no llama a Andes para roles que no son profesional ni farmacéutico', async () => {
            await createUser({ username: 'aud1', email: 'aud@test.com', roleType: 'auditor' });

            await service.login({ identifier: 'aud1', password: 'password123' });

            expect(andesStub.getProfessionalByDocumento).not.toHaveBeenCalled();
            expect(andesStub.getPharmacyByCuit).not.toHaveBeenCalled();
        });

        it('sincroniza datos de farmacia (cuil, razonSocial, matrícula DT y businessName)', async () => {
            await createUser({ username: '20123456789', email: 'farm@test.com', roleType: 'pharmacist', businessName: '' });
            andesStub.pharmacy = {
                _id: 'farm1',
                cuit: '20123456789',
                denominacion: 'Farmacia Centro',
                razonSocial: 'Farmacia Centro S.A.',
                matriculaDTResponsable: 'DT-999',
            };

            await service.login({ identifier: '20123456789', password: 'password123' });

            const updated = await repository.findOneByUsername('20123456789');
            expect(updated?.cuil).toBe('20123456789');
            expect(updated?.razonSocial).toBe('Farmacia Centro S.A.');
            expect(updated?.responsibleDTEnrollment).toBe('DT-999');
            expect(updated?.businessName).toBe('Farmacia Centro S.A.');
        });
    });
});
