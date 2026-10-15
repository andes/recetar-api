import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PrescriptionRepository } from '../../../src/modules/prescriptions/prescription.repository';
import { PrescriptionAndesRepository } from '../../../src/integrations/andes';
import { PrescriptionService } from '../../../src/modules/prescriptions/prescription.service';
import { AndesClient } from '../../../src/integrations/andes';
import { PraxisClient } from '../../../src/integrations/praxis';
import { PatientService } from '../../../src/modules/patients';
import { UsersRepository } from '../../../src/modules/users/users.repository';

jest.setTimeout(15000);

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const mockAndesClient = new AndesClient();
const patientStub = {
    resolveSnapshot: async (dni: string, sex: string) => ({ firstName: 'Juan', lastName: 'Pérez', dni, sex, idMPI: 'andes-1' }),
} as unknown as PatientService;
const usersStub = { findByCuilOrUsername: jest.fn(async () => []) } as unknown as UsersRepository;

let repo: PrescriptionRepository;
let andesRepo: PrescriptionAndesRepository;
let service: PrescriptionService;

const fakePraxis = {
    createPrescription: jest.fn(async () => ({ idPrescripcion: 'PRAX-H', estado: 'creada' })),
} as unknown as PraxisClient;

beforeAll(async () => {
    await connectTestDB();
    repo = new PrescriptionRepository();
    andesRepo = new PrescriptionAndesRepository();
    service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, fakePraxis);
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

function ingestPayload(overrides: Record<string, unknown> = {}) {
    return {
        idPrestacion: 'PREST-1',
        idRegistro: 'REG-1',
        paciente: { id: 'mpi-1', nombre: 'Juan', apellido: 'Pérez', documento: '12345678', sexo: 'masculino' },
        profesional: { id: 'prof-1', nombre: 'Carlos', apellido: 'Gómez', matricula: '1234' },
        organizacion: { id: 'org-1', nombre: 'Hospital' },
        diagnostico: 'Hipertensión',
        medicamento: { concepto: { conceptId: '123', term: 'Enalapril' }, cantEnvases: 2, cantidad: 30 },
        ...overrides,
    };
}

const patient = { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' };
const professional = { userId: '000000000000000000000001', businessName: 'Dr. Gómez' };
const medicamento = { supply: { name: 'Ibuprofeno 400mg' }, quantity: 10 };

describe('Hub de recetas (compatible ANDES)', () => {
    it('getRecetasPorPrestacion devuelve el shape compatible', async () => {
        await service.ingest(ingestPayload() as any);

        const recetas = await service.getRecetasPorPrestacion('PREST-1');

        expect(recetas).toHaveLength(1);
        expect(recetas[0].medicamento?.nombre).toBe('Enalapril');
        expect(recetas[0].idPrestacion).toBe('PREST-1');
        expect(recetas[0].idRegistro).toBe('REG-1');
        expect(recetas[0].estadoActual?.tipo).toBeDefined();
        expect(recetas[0].idReceta).toBeDefined();
    });

    it('getRecetasPorPaciente devuelve solo públicas por defecto y todas con ambito=todas', async () => {
        await service.ingest(ingestPayload() as any);
        await service.create({ patient, professional, supplies: [medicamento], ambito: 'privado' });

        const publicas = await service.getRecetasPorPaciente('12345678');
        const todas = await service.getRecetasPorPaciente('12345678', 'todas');

        expect(publicas).toHaveLength(1);
        expect(todas).toHaveLength(2);
    });

    it('patchReceta suspender fija Suspendida', async () => {
        const docs = await service.ingest(ingestPayload() as any);

        const receta = await service.patchReceta('suspender', { recetaId: docs[0]._id.toString(), motivo: 'x' });

        expect(receta?.estadoActual?.tipo).toBe('suspendida');
    });

    it('patchReceta dispensar fija finalizada + dispensa', async () => {
        const docs = await service.ingest(ingestPayload() as any);

        const receta = await service.patchReceta('dispensar', { recetaId: docs[0]._id.toString() });

        expect(receta?.estadoActual?.tipo).toBe('finalizada');
        expect(receta?.estadoDispensaActual?.tipo).toBe('dispensada');
    });

    it('getRecetasPorPrestacion devuelve las N recetas de un prolongado con idReceta', async () => {
        await service.ingest(ingestPayload({
            medicamento: { concepto: { conceptId: '123', term: 'Enalapril' }, cantEnvases: 2, tratamientoProlongado: true, tiempoTratamiento: { id: '3' } },
        }) as any);

        const recetas = await service.getRecetasPorPrestacion('PREST-1');

        expect(recetas).toHaveLength(3);
        expect(recetas.every(r => r.idReceta)).toBe(true);
        expect(recetas.map(r => (r.medicamento as any)?.ordenTratamiento)).toEqual([0, 1, 2]);
    });

    it('recordDispensa registra la dispensa y marca finalizada', async () => {
        const docs = await service.ingest(ingestPayload() as any);

        const receta = await service.recordDispensa(docs[0]._id.toString(), { tipo: 'dispensada', sistema: 'sifaho', cantidad: 2 });

        expect(receta?.estadoDispensaActual?.tipo).toBe('dispensada');
        expect(receta?.estadoActual?.tipo).toBe('finalizada');
    });

    it('patchReceta rechazar fija Rechazada', async () => {
        const docs = await service.ingest(ingestPayload() as any);

        const receta = await service.patchReceta('rechazar', { recetaId: docs[0]._id.toString() });

        expect(receta?.estadoActual?.tipo).toBe('rechazada');
    });
});
