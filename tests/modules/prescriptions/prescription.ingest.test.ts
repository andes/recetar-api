import request from 'supertest';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { createApp } from '../../helpers/app';
import { PrescriptionRepository } from '../../../src/modules/prescriptions/prescription.repository';
import { PrescriptionAndesRepository } from '../../../src/integrations/andes';
import { PrescriptionService } from '../../../src/modules/prescriptions/prescription.service';
import { AndesClient } from '../../../src/integrations/andes';
import { PraxisClient } from '../../../src/integrations/praxis';
import { PatientService } from '../../../src/modules/patients';
import { UsersRepository } from '../../../src/modules/users/users.repository';
import { ApplicationService } from '../../../src/modules/applications/applications.service';
import { ApplicationRepository } from '../../../src/modules/applications/applications.repository';
import Prescription from '../../../src/modules/prescriptions/prescription.model';

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
let app: ReturnType<typeof createApp>;
let applicationService: ApplicationService;
let applicationRepository: ApplicationRepository;

const fakePraxis = {
    createPrescription: jest.fn(async () => ({ idPrescripcion: 'PRAX-I', estado: 'creada' })),
} as unknown as PraxisClient;

beforeAll(async () => {
    await connectTestDB();
    app = createApp();
    repo = new PrescriptionRepository();
    andesRepo = new PrescriptionAndesRepository();
    service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub, fakePraxis);
    applicationRepository = new ApplicationRepository();
    applicationService = new ApplicationService(applicationRepository, logger as any);
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

describe('PrescriptionService.ingest', () => {
    it('crea una receta pública con identificadores prestacion/registro', async () => {
        const docs = await service.ingest(ingestPayload() as any);

        expect(docs).toHaveLength(1);
        const doc = docs[0];
        expect(doc.ambito).toBe('publico');
        expect(doc.supplies[0].supply.name).toBe('Enalapril');
        expect(doc.identificadoresExternos?.some(e => e.entidad === 'prestacion' && e.valor === 'PREST-1')).toBe(true);
        expect(doc.identificadoresExternos?.some(e => e.entidad === 'registro' && e.valor === 'REG-1')).toBe(true);
    });

    it('deduplica por idRegistro + conceptId', async () => {
        await service.ingest(ingestPayload() as any);
        const docs = await service.ingest(ingestPayload() as any);

        expect(docs).toHaveLength(1);
        const all = await Prescription.find({}).exec();
        expect(all).toHaveLength(1);
    });

    it('crea N recetas para un tratamiento prolongado', async () => {
        const payload = ingestPayload({
            medicamento: { concepto: { conceptId: '123', term: 'Enalapril' }, cantEnvases: 2, tratamientoProlongado: true, tiempoTratamiento: { id: '3' } },
        });

        const docs = await service.ingest(payload as any);

        expect(docs).toHaveLength(3);
        const all = await Prescription.find({}).sort({ date: 1 }).exec();
        expect(all.map((p: any) => p.ordenTratamiento)).toEqual([0, 1, 2]);
        expect(new Set(all.map((p: any) => p.treatmentGroupId)).size).toBe(1);
    });

    it('marca magistral como no_aplicable y no envía a Praxis', async () => {
        const payload = ingestPayload({
            medicamento: { esMagistral: true, magistral: { nombre: 'Magistral Y' }, cantEnvases: 1 },
        });

        const docs = await service.ingest(payload as any);

        expect(docs[0].supplies[0].supply.type).toBe('magistral');
        expect(docs[0].syncExterno?.praxis?.estado).toBe('no_aplicable');
        expect(fakePraxis.createPrescription).not.toHaveBeenCalled();
    });
});

describe('POST /api/prescriptions/andes/ingest', () => {
    it('rechaza sin token de aplicación', async () => {
        const res = await request(app).post('/api/prescriptions/andes/ingest').send(ingestPayload());
        expect(res.status).toBe(401);
    });

    it('acepta con un token de aplicación con el permiso', async () => {
        const application = await applicationService.create({ nombre: 'ANDES', permisos: ['prescription:create'] });
        const { jwt } = await applicationService.issueToken(application._id.toString());

        const res = await request(app)
            .post('/api/prescriptions/andes/ingest')
            .set('Authorization', `Bearer ${jwt}`)
            .send(ingestPayload());

        expect(res.status).toBe(201);
    });

    it('rechaza con 403 cuando la aplicación no tiene el permiso', async () => {
        const application = await applicationService.create({ nombre: 'SIFAHO', permisos: ['patient:read'] });
        const { jwt } = await applicationService.issueToken(application._id.toString());

        const res = await request(app)
            .post('/api/prescriptions/andes/ingest')
            .set('Authorization', `Bearer ${jwt}`)
            .send(ingestPayload());

        expect(res.status).toBe(403);
    });
});
