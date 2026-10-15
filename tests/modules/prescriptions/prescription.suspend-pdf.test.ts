import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PrescriptionRepository } from '../../../src/modules/prescriptions/prescription.repository';
import { PrescriptionAndesRepository } from '../../../src/integrations/andes';
import { PrescriptionService } from '../../../src/modules/prescriptions/prescription.service';
import { AndesClient } from '../../../src/integrations/andes';
import { PraxisClient } from '../../../src/integrations/praxis';
import { PatientService } from '../../../src/modules/patients';
import { UsersRepository } from '../../../src/modules/users/users.repository';
import Prescription from '../../../src/modules/prescriptions/prescription.model';
import { toAppPrescription, toAppPrescriptionList } from '../../../src/modules/prescriptions/prescription.view';
import {
    PrescriptionNotSuspendableError,
    PrescriptionPublishedError,
    PrescriptionPdfUnavailableError,
} from '../../../src/modules/prescriptions/prescription.errors';

jest.setTimeout(15000);

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: jest.fn(),
    logWarn: (..._args: unknown[]) => {},
};

const mockAndesClient = new AndesClient();

const patientStub = {
    resolveSnapshot: async (dni: string, sex: string) => ({
        firstName: 'Juan',
        lastName: 'Pérez',
        dni,
        sex,
        idMPI: 'andes-1',
    }),
} as unknown as PatientService;

const usersStub = {
    findByCuilOrUsername: jest.fn(async () => []),
} as unknown as UsersRepository;

let repo: PrescriptionRepository;
let andesRepo: PrescriptionAndesRepository;

beforeAll(async () => {
    await connectTestDB();
    repo = new PrescriptionRepository();
    andesRepo = new PrescriptionAndesRepository();
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
    logger.logError.mockClear();
});

function buildService(praxisClient?: PraxisClient): PrescriptionService {
    return new PrescriptionService(
        repo,
        andesRepo,
        mockAndesClient,
        patientStub,
        logger as any,
        usersStub,
        praxisClient,
    );
}

async function createPrescription(overrides: Record<string, unknown> = {}) {
    return Prescription.create({
        patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
        professional: { userId: '000000000000000000000001', businessName: 'Dr. Gómez' },
        supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 10 }],
        status: 'Pendiente',
        date: new Date(),
        ambito: 'privado',
        ...overrides,
    });
}

const praxisIdentifier = [{ entidad: 'praxis', valor: 'PRAX-1' }];

describe('PrescriptionService · suspensión', () => {
    it('suspende localmente y anula en Praxis cuando hay identificador', async () => {
        const praxisClient = {
            annulPrescription: jest.fn(async () => undefined),
        } as unknown as PraxisClient;
        const service = buildService(praxisClient);
        const doc = await createPrescription({ identificadoresExternos: praxisIdentifier, praxisHash: 'HASH-1' });

        const result = await service.suspend(doc._id.toString(), { motivo: 'error' });

        expect(result.status).toBe('Suspendida');
        expect(result.estadoActual?.tipo).toBe('suspendida');
        expect(praxisClient.annulPrescription).toHaveBeenCalledWith('PRAX-1', 'HASH-1');
        expect(praxisClient.annulPrescription).toHaveBeenCalledTimes(1);
    });

    it('mantiene la suspensión local aunque Praxis falle (local-first)', async () => {
        const praxisClient = {
            annulPrescription: jest.fn(async () => { throw new Error('Praxis down'); }),
        } as unknown as PraxisClient;
        const service = buildService(praxisClient);
        const doc = await createPrescription({ identificadoresExternos: praxisIdentifier, praxisHash: 'HASH-1' });

        const result = await service.suspend(doc._id.toString());

        expect(result.status).toBe('Suspendida');
        expect(praxisClient.annulPrescription).toHaveBeenCalledTimes(1);
        expect(logger.logError).toHaveBeenCalled();
    });

    it('no llama a Praxis cuando no hay identificador', async () => {
        const praxisClient = {
            annulPrescription: jest.fn(async () => undefined),
        } as unknown as PraxisClient;
        const service = buildService(praxisClient);
        const doc = await createPrescription();

        const result = await service.suspend(doc._id.toString());

        expect(result.status).toBe('Suspendida');
        expect(praxisClient.annulPrescription).not.toHaveBeenCalled();
    });

    it('rechaza suspender una receta que no está Pendiente', async () => {
        const service = buildService();
        const doc = await createPrescription({ status: 'Dispensada' });

        await expect(service.suspend(doc._id.toString())).rejects.toBeInstanceOf(PrescriptionNotSuspendableError);
    });

    it('anula en Praxis al suspender desde el hub (patchReceta)', async () => {
        const praxisClient = {
            annulPrescription: jest.fn(async () => undefined),
        } as unknown as PraxisClient;
        const service = buildService(praxisClient);
        const doc = await createPrescription({ identificadoresExternos: praxisIdentifier, praxisHash: 'HASH-1' });

        await service.patchReceta('suspender', { recetaId: doc._id.toString(), motivo: 'error' });

        expect(praxisClient.annulPrescription).toHaveBeenCalledWith('PRAX-1', 'HASH-1');
        const updated = await repo.findById(doc._id.toString());
        expect(updated?.status).toBe('Suspendida');
    });
});

describe('PrescriptionService · PDF', () => {
    it('devuelve el PDF cuando hay identificador de Praxis', async () => {
        const praxisClient = {
            getPrescriptionPdf: jest.fn(async () => ({ pdf: 'BASE64', contentType: 'application/pdf' })),
        } as unknown as PraxisClient;
        const service = buildService(praxisClient);
        const doc = await createPrescription({ identificadoresExternos: praxisIdentifier, praxisHash: 'HASH-1' });

        const result = await service.getPdf(doc._id.toString());

        expect(result).toEqual({ pdf: 'BASE64', contentType: 'application/pdf' });
        expect(praxisClient.getPrescriptionPdf).toHaveBeenCalledWith('PRAX-1', 'HASH-1');
    });

    it('responde no disponible cuando no hay identificador de Praxis', async () => {
        const service = buildService({ getPrescriptionPdf: jest.fn() } as unknown as PraxisClient);
        const doc = await createPrescription();

        await expect(service.getPdf(doc._id.toString())).rejects.toBeInstanceOf(PrescriptionPdfUnavailableError);
    });

    it('responde no disponible cuando Praxis falla', async () => {
        const praxisClient = {
            getPrescriptionPdf: jest.fn(async () => { throw new Error('Praxis down'); }),
        } as unknown as PraxisClient;
        const service = buildService(praxisClient);
        const doc = await createPrescription({ identificadoresExternos: praxisIdentifier, praxisHash: 'HASH-1' });

        await expect(service.getPdf(doc._id.toString())).rejects.toBeInstanceOf(PrescriptionPdfUnavailableError);
    });
});

describe('PrescriptionService · borrado protegido', () => {
    it('rechaza eliminar una receta ya publicada', async () => {
        const service = buildService();
        const doc = await createPrescription({ identificadoresExternos: praxisIdentifier });

        await expect(service.delete(doc._id.toString())).rejects.toBeInstanceOf(PrescriptionPublishedError);
        expect(await repo.findById(doc._id.toString())).not.toBeNull();
    });

    it('elimina una receta pendiente no publicada', async () => {
        const service = buildService();
        const doc = await createPrescription();

        await service.delete(doc._id.toString());

        expect(await repo.findById(doc._id.toString())).toBeNull();
    });
});

describe('prescription.view', () => {
    it('expone estadoPublicacion y oculta los identificadores externos', () => {
        const input = {
            _id: '1',
            status: 'Pendiente',
            syncExterno: { praxis: { estado: 'ok', intentos: 0 } },
            identificadoresExternos: praxisIdentifier,
        };

        const result = toAppPrescription(input) as Record<string, unknown>;

        expect(result['estadoPublicacion']).toBe('ok');
        expect(result['syncExterno']).toBeUndefined();
        expect(result['identificadoresExternos']).toBeUndefined();
        expect(result['status']).toBe('Pendiente');
        expect(input.syncExterno).toBeDefined();
    });

    it('usa desconocido cuando no hay estado de sincronización', () => {
        const result = toAppPrescription({ _id: '1', status: 'Pendiente' }) as Record<string, unknown>;
        expect(result['estadoPublicacion']).toBe('desconocido');
    });

    it('oculta los identificadores en listas y agrega estadoPublicacion', () => {
        const list = toAppPrescriptionList([
            { _id: '1', syncExterno: { praxis: { estado: 'pendiente' } }, identificadoresExternos: [] },
        ]) as Record<string, unknown>[];

        expect(list[0]['syncExterno']).toBeUndefined();
        expect(list[0]['identificadoresExternos']).toBeUndefined();
        expect(list[0]['estadoPublicacion']).toBe('pendiente');
    });
});
