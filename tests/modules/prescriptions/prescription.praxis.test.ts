import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PrescriptionRepository } from '../../../src/modules/prescriptions/prescription.repository';
import { PrescriptionAndesRepository } from '../../../src/integrations/andes';
import { PrescriptionService } from '../../../src/modules/prescriptions/prescription.service';
import { AndesClient } from '../../../src/integrations/andes';
import { PraxisClient } from '../../../src/integrations/praxis';
import { PatientService } from '../../../src/modules/patients';
import { UsersRepository } from '../../../src/modules/users/users.repository';
import Prescription from '../../../src/modules/prescriptions/prescription.model';

jest.setTimeout(15000);

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
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
});

const patient = { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' };
const professional = { userId: '000000000000000000000001', businessName: 'Dr. Gómez' };
const medicamento = { supply: { name: 'Ibuprofeno 400mg' }, quantity: 10 };

describe('PrescriptionService · sincronización con Praxis', () => {
    it('guarda el idPrescripcion y marca ok para un medicamento elegible', async () => {
        const praxisClient = {
            createPrescription: jest.fn(async () => ({ idPrescripcion: 'PRAX-1', estado: 'creada' })),
        } as unknown as PraxisClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxisClient);

        const result = await service.create({ patient, professional, supplies: [medicamento] });

        expect(praxisClient.createPrescription).toHaveBeenCalledTimes(1);
        expect(result.syncExterno?.praxis?.estado).toBe('ok');
        expect(result.identificadoresExternos).toHaveLength(1);
        expect(result.identificadoresExternos![0]).toMatchObject({ entidad: 'praxis', valor: 'PRAX-1' });
    });

    it('comparte el idPrescripcion entre los meses de un tratamiento prolongado', async () => {
        const praxisClient = {
            createPrescription: jest.fn(async () => ({ idPrescripcion: 'PRAX-2', estado: 'creada' })),
        } as unknown as PraxisClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxisClient);

        await service.create({ patient, professional, supplies: [medicamento], tratamientoProlongado: 3 });

        const all = await Prescription.find({}).exec();
        expect(all).toHaveLength(3);
        expect(praxisClient.createPrescription).toHaveBeenCalledTimes(1);
        expect(all.every((p: any) => p.identificadoresExternos.some((e: any) => e.entidad === 'praxis' && e.valor === 'PRAX-2'))).toBe(true);
    });

    it('marca no_aplicable para un magistral y no llama a Praxis', async () => {
        const praxisClient = {
            createPrescription: jest.fn(async () => ({ idPrescripcion: 'PRAX-3', estado: 'creada' })),
        } as unknown as PraxisClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxisClient);

        const result = await service.create({
            patient,
            professional,
            supplies: [{ supply: { name: 'Magistral X', type: 'magistral' }, quantity: 1 }],
        });

        expect(result.syncExterno?.praxis?.estado).toBe('no_aplicable');
        expect(praxisClient.createPrescription).not.toHaveBeenCalled();
    });

    it('marca pendiente cuando Praxis falla (local-first)', async () => {
        const praxisClient = {
            createPrescription: jest.fn(async () => { throw new Error('Praxis down'); }),
        } as unknown as PraxisClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxisClient);

        const result = await service.create({ patient, professional, supplies: [medicamento] });

        expect(result.syncExterno?.praxis?.estado).toBe('pendiente');
        expect(result.syncExterno?.praxis?.intentos).toBe(0);
        expect(result.identificadoresExternos).toHaveLength(0);
    });

    it('no intenta Praxis cuando no hay cliente configurado', async () => {
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub);

        const result = await service.create({ patient, professional, supplies: [medicamento] });

        expect(result.syncExterno?.praxis?.estado).toBe('pendiente');
    });
});
