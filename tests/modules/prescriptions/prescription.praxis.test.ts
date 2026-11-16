import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PrescriptionRepository } from '../../../src/modules/prescriptions/prescription.repository';
import { PrescriptionAndesRepository } from '../../../src/integrations/andes';
import { PrescriptionService } from '../../../src/modules/prescriptions/prescription.service';
import { AndesClient } from '../../../src/integrations/andes';
import { PraxisClient } from '../../../src/integrations/praxis';
import { PraxisEligibilityError, PraxisNotEligibleError, PraxisPublicationError, PraxisResponseError } from '../../../src/integrations/praxis';
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
    findById: jest.fn(async () => ({
        cuil: '20-12345678-9',
        enrollment: '9999',
        profesionGrado: [{ profesion: 'Médico', codigoProfesion: '1', numeroMatricula: '5555' }],
    })),
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

function hasIdentifier(doc: { identificadoresExternos?: Array<{ entidad: string; valor: string }> }, entidad: string, valor: string): boolean {
    return !!doc.identificadoresExternos?.some(entry => entry.entidad === entidad && entry.valor === valor);
}

describe('PrescriptionService · sincronización con Praxis', () => {
    it('guarda el hash de prescripción, el hash de la receta y las recetas emitidas para un medicamento elegible', async () => {
        const praxisClient = {
            createPrescription: jest.fn(async () => ({
                idPrescripcion: 1,
                hash: 'HASH-1',
                recetasEmitidas: [{ idReceta: 10, numeroReceta: '100', hash: 'REC-1', cuirs: [null] }],
            })),
        } as unknown as PraxisClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxisClient);

        const result = await service.create({ patient, professional, supplies: [medicamento] });

        expect(praxisClient.createPrescription).toHaveBeenCalledTimes(1);
        expect(result.syncExterno?.praxis?.estado).toBe('ok');
        expect(result.syncExterno?.praxis?.idPrescripcion).toBe('1');
        expect(result.syncExterno?.praxis?.idReceta).toBe('10');
        expect(result.syncExterno?.praxis?.cuirs).toBeUndefined();
        expect(result.identificadoresExternos).toHaveLength(2);
        expect(hasIdentifier(result, 'praxis', 'HASH-1')).toBe(true);
        expect(hasIdentifier(result, 'praxis-receta', 'REC-1')).toBe(true);
        expect(result.praxisHash).toBe('HASH-1');
        expect(result.praxisRecetas).toHaveLength(1);
        expect(result.praxisRecetas![0]).toMatchObject({ idReceta: '10', numeroReceta: '100', hash: 'REC-1' });
    });

    it('marca no_aplicable para paciente sin DNI en ámbito público (local-only)', async () => {
        const praxisClient = {
            createPrescription: jest.fn(async () => { throw new PraxisNotEligibleError('Paciente sin DNI'); }),
        } as unknown as PraxisClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxisClient);

        const result = await service.create({ patient, professional, supplies: [medicamento], ambito: 'publico' });

        expect(result.syncExterno?.praxis?.estado).toBe('no_aplicable');
        expect(result.syncExterno?.praxis?.ultimoError).toBe('Paciente sin DNI');
    });

    it('bloquea y no persiste cuando la receta no es elegible por datos', async () => {
        const praxisClient = {
            createPrescription: jest.fn(async () => { throw new PraxisNotEligibleError('Producto sin código Alfabeta'); }),
        } as unknown as PraxisClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxisClient);

        await expect(service.create({ patient, professional, supplies: [medicamento] }))
            .rejects.toBeInstanceOf(PraxisEligibilityError);

        const all = await Prescription.find({}).exec();
        expect(all).toHaveLength(0);
    });

    it('completa el profesional desde el perfil cacheado cuando el cliente no lo envía', async () => {
        const praxisClient = {
            createPrescription: jest.fn(async () => ({ idPrescripcion: 1, hash: 'HASH' })),
        } as unknown as PraxisClient;
        const professionalProfileService = {
            requireForUser: jest.fn(async () => ({
                tipoDocumento: 'DNI',
                documento: '12345678',
                nombre: 'Ana',
                apellido: 'Pérez',
                sexo: 'Femenino',
                cuit: '20-12345678-9',
                profesionGrado: [{ profesion: 'Médico', codigoProfesion: '1', numeroMatricula: '9999' }],
            })),
        };
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxisClient, professionalProfileService as any);

        const result = await service.create({ patient, professional, supplies: [medicamento] });

        expect(result.professional.enrollment).toBe('9999');
        expect(result.professional.cuil).toBe('20-12345678-9');
        expect(result.professional.tipoDocumento).toBe('DNI');
        expect(result.professional.documento).toBe('12345678');
        expect(result.professional.profesionGrado?.[0]?.numeroMatricula).toBe('9999');
    });

    it('comparte el hash de prescripción y asigna una receta por mes en un tratamiento prolongado', async () => {
        const praxisClient = {
            createPrescription: jest.fn(async () => ({
                idPrescripcion: 2,
                hash: 'HASH-2',
                recetasEmitidas: [
                    { idReceta: 20, hash: 'REC-1' },
                    { idReceta: 21, hash: 'REC-2' },
                    { idReceta: 22, hash: 'REC-3' },
                ],
            })),
        } as unknown as PraxisClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxisClient);

        await service.create({ patient, professional, supplies: [medicamento], tratamientoProlongado: 3 });

        const all = await Prescription.find({}).sort({ ordenTratamiento: 1 }).exec();
        expect(all).toHaveLength(3);
        expect(praxisClient.createPrescription).toHaveBeenCalledTimes(1);
        expect(all.every((p: any) => hasIdentifier(p, 'praxis', 'HASH-2'))).toBe(true);
        expect(all.every((p: any) => p.syncExterno?.praxis?.idPrescripcion === '2')).toBe(true);
        expect(all.map((p: any) => p.identificadoresExternos.find((e: any) => e.entidad === 'praxis-receta')?.valor))
            .toEqual(['REC-1', 'REC-2', 'REC-3']);
    });

    it('registra una observación cuando Praxis emite menos recetas que meses', async () => {
        const praxisClient = {
            createPrescription: jest.fn(async () => ({
                idPrescripcion: 3,
                hash: 'HASH-3',
                recetasEmitidas: [{ idReceta: 30, hash: 'REC-1' }],
            })),
        } as unknown as PraxisClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxisClient);

        await service.create({ patient, professional, supplies: [medicamento], tratamientoProlongado: 3 });

        const all = await Prescription.find({}).sort({ ordenTratamiento: 1 }).exec();
        expect(all).toHaveLength(3);
        expect(all[0].syncExterno?.praxis?.observacion).toContain('1 receta');
        expect(all[1].identificadoresExternos?.some((e: any) => e.entidad === 'praxis-receta')).toBe(false);
        expect(all[2].identificadoresExternos?.some((e: any) => e.entidad === 'praxis-receta')).toBe(false);
    });

    it('marca no_aplicable para un magistral y no llama a Praxis', async () => {
        const praxisClient = {
            createPrescription: jest.fn(async () => ({ idPrescripcion: 4, hash: 'HASH-4' })),
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

    it('lanza error y no persiste cuando Praxis falla', async () => {
        const praxisClient = {
            createPrescription: jest.fn(async () => { throw new Error('Praxis down'); }),
        } as unknown as PraxisClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxisClient);

        await expect(service.create({ patient, professional, supplies: [medicamento] }))
            .rejects.toBeInstanceOf(PraxisPublicationError);

        const all = await Prescription.find({}).exec();
        expect(all).toHaveLength(0);
    });

    it('lanza error y no persiste cuando Praxis responde con error', async () => {
        const praxisClient = {
            createPrescription: jest.fn(async () => { throw new PraxisResponseError('Producto inválido', 400); }),
        } as unknown as PraxisClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxisClient);

        await expect(service.create({ patient, professional, supplies: [medicamento] }))
            .rejects.toBeInstanceOf(PraxisPublicationError);

        const all = await Prescription.find({}).exec();
        expect(all).toHaveLength(0);
    });

    it('no intenta Praxis cuando no hay cliente configurado', async () => {
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub);

        const result = await service.create({ patient, professional, supplies: [medicamento] });

        expect(result.syncExterno?.praxis?.estado).toBe('pendiente');
    });
});
