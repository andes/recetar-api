import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PrescriptionRepository } from '../../../src/modules/prescriptions/prescription.repository';
import { PrescriptionAndesRepository } from '../../../src/integrations/andes';
import { PrescriptionService } from '../../../src/modules/prescriptions/prescription.service';
import { AndesClient } from '../../../src/integrations/andes';
import { PraxysClient } from '../../../src/integrations/praxys';
import { PraxysEligibilityError, PraxysNotEligibleError, PraxysPublicationError, PraxysResponseError } from '../../../src/integrations/praxys';
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

describe('PrescriptionService · sincronización con Praxys', () => {
    it('guarda el hash de prescripción, el hash de la receta y las recetas emitidas para un medicamento elegible', async () => {
        const praxysClient = {
            createPrescription: jest.fn(async () => ({
                idPrescripcion: 1,
                hash: 'HASH-1',
                recetasEmitidas: [{ idReceta: 10, numeroReceta: '100', hash: 'REC-1', cuirs: [null] }],
            })),
        } as unknown as PraxysClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxysClient);

        const result = await service.create({ patient, professional, supplies: [medicamento] });

        expect(praxysClient.createPrescription).toHaveBeenCalledTimes(1);
        expect(result.syncExterno?.praxys?.estado).toBe('ok');
        expect(result.syncExterno?.praxys?.idPrescripcion).toBe('1');
        expect(result.syncExterno?.praxys?.idReceta).toBe('10');
        expect(result.syncExterno?.praxys?.cuirs).toBeUndefined();
        expect(result.identificadoresExternos).toHaveLength(2);
        expect(hasIdentifier(result, 'praxys', 'HASH-1')).toBe(true);
        expect(hasIdentifier(result, 'praxys-receta', 'REC-1')).toBe(true);
        expect(result.praxysHash).toBe('HASH-1');
        expect(result.praxysRecetas).toHaveLength(1);
        expect(result.praxysRecetas![0]).toMatchObject({ idReceta: '10', numeroReceta: '100', hash: 'REC-1' });
    });

    it('marca no_aplicable para paciente sin DNI en ámbito público (local-only)', async () => {
        const praxysClient = {
            createPrescription: jest.fn(async () => { throw new PraxysNotEligibleError('Paciente sin DNI'); }),
        } as unknown as PraxysClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxysClient);

        const result = await service.create({ patient, professional, supplies: [medicamento], ambito: 'publico' });

        expect(result.syncExterno?.praxys?.estado).toBe('no_aplicable');
        expect(result.syncExterno?.praxys?.ultimoError).toBe('Paciente sin DNI');
    });

    it('bloquea y no persiste cuando la receta no es elegible por datos', async () => {
        const praxysClient = {
            createPrescription: jest.fn(async () => { throw new PraxysNotEligibleError('Producto sin código Alfabeta'); }),
        } as unknown as PraxysClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxysClient);

        await expect(service.create({ patient, professional, supplies: [medicamento] }))
            .rejects.toBeInstanceOf(PraxysEligibilityError);

        const all = await Prescription.find({}).exec();
        expect(all).toHaveLength(0);
    });

    it('completa el profesional desde el perfil cacheado cuando el cliente no lo envía', async () => {
        const praxysClient = {
            createPrescription: jest.fn(async () => ({ idPrescripcion: 1, hash: 'HASH' })),
        } as unknown as PraxysClient;
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
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxysClient, professionalProfileService as any);

        const result = await service.create({ patient, professional, supplies: [medicamento] });

        expect(result.professional.enrollment).toBe('9999');
        expect(result.professional.cuil).toBe('20-12345678-9');
        expect(result.professional.tipoDocumento).toBe('DNI');
        expect(result.professional.documento).toBe('12345678');
        expect(result.professional.profesionGrado?.[0]?.numeroMatricula).toBe('9999');
    });

    it('comparte el hash de prescripción y asigna una receta por mes en un tratamiento prolongado', async () => {
        const praxysClient = {
            createPrescription: jest.fn(async () => ({
                idPrescripcion: 2,
                hash: 'HASH-2',
                recetasEmitidas: [
                    { idReceta: 20, hash: 'REC-1' },
                    { idReceta: 21, hash: 'REC-2' },
                    { idReceta: 22, hash: 'REC-3' },
                ],
            })),
        } as unknown as PraxysClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxysClient);

        await service.create({ patient, professional, supplies: [medicamento], tratamientoProlongado: 3 });

        const all = await Prescription.find({}).sort({ ordenTratamiento: 1 }).exec();
        expect(all).toHaveLength(3);
        expect(praxysClient.createPrescription).toHaveBeenCalledTimes(1);
        expect(all.every((p: any) => hasIdentifier(p, 'praxys', 'HASH-2'))).toBe(true);
        expect(all.every((p: any) => p.syncExterno?.praxys?.idPrescripcion === '2')).toBe(true);
        expect(all.map((p: any) => p.identificadoresExternos.find((e: any) => e.entidad === 'praxys-receta')?.valor))
            .toEqual(['REC-1', 'REC-2', 'REC-3']);
    });

    it('registra una observación cuando Praxys emite menos recetas que meses', async () => {
        const praxysClient = {
            createPrescription: jest.fn(async () => ({
                idPrescripcion: 3,
                hash: 'HASH-3',
                recetasEmitidas: [{ idReceta: 30, hash: 'REC-1' }],
            })),
        } as unknown as PraxysClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxysClient);

        await service.create({ patient, professional, supplies: [medicamento], tratamientoProlongado: 3 });

        const all = await Prescription.find({}).sort({ ordenTratamiento: 1 }).exec();
        expect(all).toHaveLength(3);
        expect(all[0].syncExterno?.praxys?.observacion).toContain('1 receta');
        expect(all[1].identificadoresExternos?.some((e: any) => e.entidad === 'praxys-receta')).toBe(false);
        expect(all[2].identificadoresExternos?.some((e: any) => e.entidad === 'praxys-receta')).toBe(false);
    });

    it('marca no_aplicable para un magistral y no llama a Praxys', async () => {
        const praxysClient = {
            createPrescription: jest.fn(async () => ({ idPrescripcion: 4, hash: 'HASH-4' })),
        } as unknown as PraxysClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxysClient);

        const result = await service.create({
            patient,
            professional,
            supplies: [{ supply: { name: 'Magistral X', type: 'magistral' }, quantity: 1 }],
        });

        expect(result.syncExterno?.praxys?.estado).toBe('no_aplicable');
        expect(praxysClient.createPrescription).not.toHaveBeenCalled();
    });

    it('lanza error y no persiste cuando Praxys falla', async () => {
        const praxysClient = {
            createPrescription: jest.fn(async () => { throw new Error('Praxys down'); }),
        } as unknown as PraxysClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxysClient);

        await expect(service.create({ patient, professional, supplies: [medicamento] }))
            .rejects.toBeInstanceOf(PraxysPublicationError);

        const all = await Prescription.find({}).exec();
        expect(all).toHaveLength(0);
    });

    it('lanza error y no persiste cuando Praxys responde con error', async () => {
        const praxysClient = {
            createPrescription: jest.fn(async () => { throw new PraxysResponseError('Producto inválido', 400); }),
        } as unknown as PraxysClient;
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, praxysClient);

        await expect(service.create({ patient, professional, supplies: [medicamento] }))
            .rejects.toBeInstanceOf(PraxysPublicationError);

        const all = await Prescription.find({}).exec();
        expect(all).toHaveLength(0);
    });

    it('no intenta Praxys cuando no hay cliente configurado', async () => {
        const service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub);

        const result = await service.create({ patient, professional, supplies: [medicamento] });

        expect(result.syncExterno?.praxys?.estado).toBe('pendiente');
    });
});
