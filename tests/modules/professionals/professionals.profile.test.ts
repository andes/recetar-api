import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createUser } from '../../helpers/factories';
import { ProfessionalRepository } from '../../../src/modules/professionals/professionals.repository';
import { ProfessionalService } from '../../../src/modules/professionals/professionals.service';
import { UsersRepository } from '../../../src/modules/users/users.repository';
import { ProfessionalCuilRequiredError, ProfessionalFormationRequiredError } from '../../../src/modules/professionals/professionals.errors';
import Professional from '../../../src/modules/professionals/professionals.model';

jest.setTimeout(15000);

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const andesProfessional = {
    documento: '30123456',
    tipoDocumento: 'DNI',
    nombre: 'Ana',
    apellido: 'Pérez',
    sexo: 'Femenino',
    cuit: '27-30123456-8',
    formacionGrado: [{
        profesion: { codigo: 1, nombre: 'MEDICO Clinico' },
        matriculado: true,
        matriculacion: [{ matriculaNumero: 156, inicio: '1990-08-01', fin: '2099-01-01' }],
    }],
};

beforeAll(async () => {
    await connectTestDB();
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

function buildService(andesClient?: unknown): ProfessionalService {
    return new ProfessionalService(
        new ProfessionalRepository(),
        new UsersRepository(),
        andesClient as never,
        logger as never,
    );
}

describe('ProfessionalService · perfil cacheado desde ANDES', () => {
    it('guarda el perfil desde ANDES (tipoDocumento, sexo, formacion) y lo devuelve', async () => {
        const user = await createUser({ username: '30123456', businessName: 'X' });
        const andesClient = { getProfessionalFormacion: jest.fn(async () => andesProfessional) };
        const service = buildService(andesClient);

        const profile = await service.requireForUser(user._id.toString());

        expect(profile.tipoDocumento).toBe('DNI');
        expect(profile.documento).toBe('30123456');
        expect(profile.sexo).toBe('Femenino');
        expect(profile.cuit).toBe('27301234568');
        expect(profile.profesionGrado[0]).toMatchObject({
            profesion: 'MEDICO Clinico',
            codigoProfesion: '1',
            numeroMatricula: '156',
            estado: 'vigente',
        });
    });

    it('lanza 422 si no hay cache y ANDES no devuelve el profesional', async () => {
        const user = await createUser({ username: '30123456', businessName: 'X' });
        const andesClient = { getProfessionalFormacion: jest.fn(async () => null) };
        const service = buildService(andesClient);

        await expect(service.requireForUser(user._id.toString()))
            .rejects.toBeInstanceOf(ProfessionalFormationRequiredError);
    });

    it('usa el CUIL de la cuenta cuando ANDES no trae cuit', async () => {
        const user = await createUser({ username: '30123456', businessName: 'X', cuil: '20-12345678-6' });
        const andesClient = { getProfessionalFormacion: jest.fn(async () => ({ ...andesProfessional, cuit: undefined })) };
        const service = buildService(andesClient);

        const profile = await service.requireForUser(user._id.toString());

        expect(profile.cuit).toBe('20123456786');
    });

    it('lanza 422 si no hay CUIT/CUIL en ANDES ni en la cuenta', async () => {
        const user = await createUser({ username: '30123456', businessName: 'X' });
        const andesClient = { getProfessionalFormacion: jest.fn(async () => ({ ...andesProfessional, cuit: undefined })) };
        const service = buildService(andesClient);

        await expect(service.requireForUser(user._id.toString()))
            .rejects.toBeInstanceOf(ProfessionalCuilRequiredError);
    });

    it('lanza 422 si el perfil cacheado no tiene matrícula', async () => {
        const user = await createUser({ username: '30123456', businessName: 'X' });
        await Professional.create({
            userId: user._id,
            tipoDocumento: 'DNI',
            documento: '30123456',
            nombre: 'Ana',
            apellido: 'Pérez',
            profesionGrado: [],
        });
        const service = buildService(undefined);

        await expect(service.requireForUser(user._id.toString()))
            .rejects.toBeInstanceOf(ProfessionalFormationRequiredError);
    });
});
