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
const patientStub = { resolveSnapshot: async () => null } as unknown as PatientService;
const usersStub = { findByCuilOrUsername: jest.fn(async () => []) } as unknown as UsersRepository;

let repo: PrescriptionRepository;
let andesRepo: PrescriptionAndesRepository;
let service: PrescriptionService;

const fakePraxis = {
    createPrescription: jest.fn(async () => ({ idPrescripcion: 'PRAX-E2E', estado: 'creada' })),
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

describe('Circuito de recetas (e2e interno)', () => {
    it('prestacion -> ingesta -> praxis -> consulta por prestacion', async () => {
        const docs = await service.ingest({
            idPrestacion: 'PREST-E2E',
            idRegistro: 'REG-E2E',
            paciente: { id: 'mpi-1', nombre: 'Juan', apellido: 'Pérez', documento: '12345678', sexo: 'masculino' },
            profesional: { id: 'prof-1', nombre: 'Carlos', apellido: 'Gómez', matricula: '1234' },
            organizacion: { id: 'org-1', nombre: 'Hospital' },
            diagnostico: 'Hipertensión',
            medicamento: { concepto: { conceptId: '123', term: 'Enalapril' }, cantEnvases: 2, cantidad: 30 },
        } as any);

        // 1) Se persiste en RecetAr con sus identificadores externos
        expect(docs).toHaveLength(1);
        expect(docs[0].identificadoresExternos?.some(e => e.entidad === 'prestacion' && e.valor === 'PREST-E2E')).toBe(true);
        expect(docs[0].identificadoresExternos?.some(e => e.entidad === 'praxis' && e.valor === 'PRAX-E2E')).toBe(true);

        // 2) Se consulta por prestacion y devuelve el shape compatible
        const recetas = await service.getRecetasPorPrestacion('PREST-E2E');
        expect(recetas).toHaveLength(1);
        expect(recetas[0].idPrestacion).toBe('PREST-E2E');
        expect(recetas[0].medicamento?.nombre).toBe('Enalapril');
    });
});
