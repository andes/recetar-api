import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PrescriptionRepository } from '../../../src/modules/prescriptions/prescription.repository';
import { PrescriptionService } from '../../../src/modules/prescriptions/prescription.service';
import { PraxisEventsRepository } from '../../../src/modules/praxis-events/praxis-events.repository';
import { PraxisEventsService } from '../../../src/modules/praxis-events/praxis-events.service';
import PraxisEvent from '../../../src/modules/praxis-events/praxis-event.model';
import { PrescriptionAndesRepository, AndesClient } from '../../../src/integrations/andes';
import { PraxisClient } from '../../../src/integrations/praxis';
import { PatientService } from '../../../src/modules/patients';
import { UsersRepository } from '../../../src/modules/users/users.repository';
import { toRecetaCompatible } from '../../../src/integrations/andes/receta-output.mapper';

jest.setTimeout(15000);

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

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
    await PraxisEvent.init();
    repo = new PrescriptionRepository();
    andesRepo = new PrescriptionAndesRepository();
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

describe('Circuito Praxis · creación, dispensa y anulación', () => {
    it('crea en Praxis, dispensa y anula por hash de receta', async () => {
        const praxisClient = {
            createPrescription: jest.fn(async () => ({
                idPrescripcion: 1,
                hash: 'HASH-E2E',
                recetasEmitidas: [{ idReceta: 10, hash: 'REC-E2E', numeroReceta: '100' }],
            })),
        } as unknown as PraxisClient;
        const prescriptionService = new PrescriptionService(
            repo,
            andesRepo,
            new AndesClient(),
            patientStub,
            logger as any,
            usersStub,
            praxisClient,
        );
        const eventsService = new PraxisEventsService(
            new PraxisEventsRepository(),
            repo,
            logger as any,
        );

        const created = await prescriptionService.create({
            patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
            professional: { userId: '000000000000000000000001', businessName: 'Dr. Gómez' },
            supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 1 }],
        });

        expect(created.identificadoresExternos?.some(e => e.entidad === 'praxis' && e.valor === 'HASH-E2E')).toBe(true);
        expect(created.identificadoresExternos?.some(e => e.entidad === 'praxis-receta' && e.valor === 'REC-E2E')).toBe(true);

        await eventsService.dispense('REC-E2E', {
            dispensa: {
                numeroAutorizacion: 'OPF-E2E',
                renglones: [{ producto: { descripcion: 'Ibuprofeno' }, cantidadEnvases: 1 }],
            },
        } as any);

        const dispensed = await repo.findById(created._id.toString());
        const compatibleDispensed = toRecetaCompatible(dispensed!);

        expect((compatibleDispensed.estadoDispensaActual as any)?.tipo).toBe('dispensada');
        expect((compatibleDispensed.dispensa as any[])[0].numeroAutorizacion).toBe('OPF-E2E');
        expect((compatibleDispensed.dispensa as any[])[0].sistema).toBe('praxis');

        await eventsService.annulReceta('REC-E2E');

        const annulled = await repo.findById(created._id.toString());
        const compatibleAnnulled = toRecetaCompatible(annulled!);

        expect(annulled?.status).toBe('Rechazada');
        expect((compatibleAnnulled.estadoActual as any)?.tipo).toBe('eliminada');

        const vigentes = await prescriptionService.getRecetasCompatibles({ estado: 'vigente' });
        expect(vigentes.some(receta => receta.idReceta === created.prescriptionId)).toBe(false);
    });
});
