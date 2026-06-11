import mongoose from 'mongoose';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PrescriptionRepository } from '../../../src/modules/prescriptions/prescription.repository';
import { PrescriptionAndesRepository } from '../../../src/integrations/andes';
import { PrescriptionService } from '../../../src/modules/prescriptions/prescription.service';
import { AndesClient } from '../../../src/integrations/andes';
import { PatientService } from '../../../src/modules/patients';
import { UsersRepository } from '../../../src/modules/users/users.repository';
import {
    PrescriptionNotFoundError,
    PrescriptionNotDispensableError,
    PrescriptionAlreadyDispensedError,
    PrescriptionCancelTimeExceededError,
    TreatmentRequiresMedicationsError,
} from '../../../src/modules/prescriptions/prescription.errors';

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
        sex: sex ? sex.charAt(0).toUpperCase() + sex.slice(1).toLowerCase() : '',
        idMPI: 'andes-1',
    }),
} as unknown as PatientService;

const usersStub = {
    findByCuilOrUsername: jest.fn(async () => [] as Array<{ _id: mongoose.Types.ObjectId }>),
} as unknown as UsersRepository;

const PrescriptionSchema = new mongoose.Schema({
    patient: {
        firstName: { type: String },
        lastName: { type: String },
        dni: { type: String },
        sex: { type: String },
        obraSocial: {
            nombre: { type: String },
            codigoPuco: { type: Number },
            numeroAfiliado: { type: String },
        },
    },
    supplies: [{
        _id: false,
        supply: {
            name: { type: String },
            type: { type: String, enum: ['device', 'nutrition', 'magistral'] },
        },
        quantity: Number,
    }],
    status: { type: String, enum: ['Pendiente', 'Dispensada', 'Vencida'], default: 'Pendiente' },
    date: { type: Date, default: Date.now },
}, { strict: false, timestamps: true });

const Prescription = mongoose.models.Prescription
    || mongoose.model('Prescription', PrescriptionSchema);

let repo: PrescriptionRepository;
let andesRepo: PrescriptionAndesRepository;
let service: PrescriptionService;

beforeAll(async () => {
    await connectTestDB();
    repo = new PrescriptionRepository();
    andesRepo = new PrescriptionAndesRepository();
    service = new PrescriptionService(repo, andesRepo, mockAndesClient, patientStub, logger as any, usersStub);
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

function createTestPrescription(overrides = {}) {
    return Prescription.create({
        patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
        professional: { userId: '000000000000000000000001', businessName: 'Dr. Gómez' },
        supplies: [{ supply: { name: 'Ibuprofeno 400mg', type: 'device' }, quantity: 10 }],
        status: 'Pendiente',
        date: new Date(),
        ...overrides,
    });
}

describe('PrescriptionService', () => {
    describe('index', () => {
        it('returns empty list', async () => {
            const result = await service.index(0, 20);
            expect(result.prescriptions).toEqual([]);
            expect(result.total).toBe(0);
        });

        it('returns paginated prescriptions', async () => {
            await createTestPrescription();
            await createTestPrescription({ date: new Date('2024-01-01') });

            const result = await service.index(0, 1);
            expect(result.prescriptions).toHaveLength(1);
            expect(result.total).toBe(2);
        });
    });

    describe('show', () => {
        it('returns prescription by id', async () => {
            const created = await createTestPrescription();
            const result = await service.show(created._id.toString());
            expect(result.patient.firstName).toBe('Juan');
        });

        it('throws PrescriptionNotFoundError', async () => {
            await expect(service.show('000000000000000000000000')).rejects.toThrow(PrescriptionNotFoundError);
        });
    });

    describe('create', () => {
        it('creates a prescription', async () => {
            const result = await service.create({
                patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
                professional: { userId: '000000000000000000000001', businessName: 'Dr. Gómez' },
                supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 10 }],
                ambito: 'privado',
            });
            expect(result.patient.firstName).toBe('Juan');
            expect(result.status).toBe('Pendiente');
            expect(result.prescriptionId).toBeDefined();
        });

        it('copies obraSocial codigoPuco as number onto the embedded patient', async () => {
            const result = await service.create({
                patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
                professional: { userId: '000000000000000000000001', businessName: 'Dr. Gómez' },
                supplies: [{
                    supply: { name: 'Ibuprofeno 400mg' },
                    quantity: 1,
                    obraSocial: { nombre: 'OSDE', codigoPuco: 123, numeroAfiliado: '456' },
                }],
            });

            expect(result.patient.obraSocial?.codigoPuco).toBe(123);
            expect(typeof result.patient.obraSocial?.codigoPuco).toBe('number');
        });

        it('creates trimestral prescriptions', async () => {
            const result = await service.create({
                patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
                professional: { userId: '000000000000000000000001', businessName: 'Dr. Gómez' },
                supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 10 }],
                trimestral: true,
            });
            expect(result).toBeDefined();

            const all = await Prescription.find({}).exec();
            expect(all.length).toBeGreaterThanOrEqual(3);
        });

        it('treats the legacy trimestral alias as 3 months without persisting trimestral', async () => {
            await service.create({
                patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
                professional: { userId: '000000000000000000000001', businessName: 'Dr. Gómez' },
                supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 10 }],
                trimestral: true,
            });

            const all = await Prescription.find({}).exec();
            expect(all).toHaveLength(3);
            expect(all.every((p: any) => p.tratamientoProlongado === 3)).toBe(true);
            expect(all.every((p: any) => p.trimestral === undefined)).toBe(true);
        });
    });

    describe('tratamientoProlongado', () => {
        const patient = { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' };
        const professional = { userId: '000000000000000000000001', businessName: 'Dr. Gómez' };
        const medications = [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 10 }];

        it('creates N prescriptions (one per month) with 30-day dates', async () => {
            await service.create({ patient, professional, supplies: medications, tratamientoProlongado: 6 });

            const all = await Prescription.find({}).sort({ date: 1 }).exec();
            expect(all).toHaveLength(6);
            for (let i = 1; i < all.length; i++) {
                const diffDays = Math.round(
                    (new Date(all[i].date).getTime() - new Date(all[i - 1].date).getTime()) / 86400000,
                );
                expect(diffDays).toBe(30);
            }
        });

        it('creates 2 prescriptions for a 2-month treatment', async () => {
            await service.create({ patient, professional, supplies: medications, tratamientoProlongado: 2 });

            const all = await Prescription.find({}).sort({ date: 1 }).exec();
            expect(all).toHaveLength(2);
            expect(all.every((p: any) => p.tratamientoProlongado === 2)).toBe(true);
        });

        it('marks every generated prescription with the same tratamientoProlongado', async () => {
            await service.create({ patient, professional, supplies: medications, tratamientoProlongado: 12 });

            const all = await Prescription.find({}).exec();
            expect(all).toHaveLength(12);
            expect(all.every((p: any) => p.tratamientoProlongado === 12)).toBe(true);
        });

        it('does not duplicate supply entries on generated prescriptions', async () => {
            await service.create({ patient, professional, supplies: medications, tratamientoProlongado: 3 });

            const all = await Prescription.find({}).exec();
            expect(all.length).toBe(3);
            expect(all.every((p: any) => p.supplies.length === 1)).toBe(true);
        });

        it('assigns the same treatmentGroupId to every receta of a treatment', async () => {
            await service.create({ patient, professional, supplies: medications, tratamientoProlongado: 6 });

            const all = await Prescription.find({}).exec();
            const ids = new Set(all.map((p: any) => p.treatmentGroupId));
            expect(ids.size).toBe(1);
            expect([...ids][0]).toBeTruthy();
        });

        it('uses different treatmentGroupId for different treatments', async () => {
            await service.create({ patient, professional, supplies: medications, tratamientoProlongado: 3 });
            await service.create({ patient, professional, supplies: medications, tratamientoProlongado: 3 });

            const all = await Prescription.find({}).exec();
            const ids = new Set(all.map((p: any) => p.treatmentGroupId));
            expect(ids.size).toBe(2);
        });

        it('does not assign treatmentGroupId without treatment', async () => {
            await service.create({ patient, professional, supplies: medications });

            const all = await Prescription.find({}).exec();
            expect((all[0] as any).treatmentGroupId).toBeUndefined();
        });

        it('creates a single prescription when there is no treatment', async () => {
            await service.create({ patient, professional, supplies: medications });

            const all = await Prescription.find({}).exec();
            expect(all).toHaveLength(1);
            expect((all[0] as any).tratamientoProlongado).toBeUndefined();
        });

        it('rejects an explicit prolonged treatment on an insumo', async () => {
            await expect(
                service.create({
                    patient,
                    professional,
                    supplies: [{ supply: { name: 'Silla de ruedas', type: 'device' }, quantity: 1, tratamientoProlongado: 3 }],
                }),
            ).rejects.toThrow(TreatmentRequiresMedicationsError);
        });

        it('ignores the legacy root treatment for insumos without failing', async () => {
            await service.create({
                patient,
                professional,
                supplies: [{ supply: { name: 'Silla de ruedas', type: 'device' }, quantity: 1 }],
                tratamientoProlongado: 3,
            });

            const all = await Prescription.find({}).exec();
            expect(all).toHaveLength(1);
            expect((all[0] as any).tratamientoProlongado).toBeUndefined();
        });

        it('applies the treatment per medication (one medication treated, one not)', async () => {
            await service.create({
                patient,
                professional,
                supplies: [
                    { supply: { name: 'Ibuprofeno 400mg' }, quantity: 10, tratamientoProlongado: 6 },
                    { supply: { name: 'Amoxicilina 500mg' }, quantity: 10 },
                ],
            });

            const all = await Prescription.find({}).exec();
            expect(all).toHaveLength(7);

            const treated = all.filter((p: any) => p.supplies[0].supply.name === 'Ibuprofeno 400mg');
            const untreated = all.filter((p: any) => p.supplies[0].supply.name === 'Amoxicilina 500mg');
            expect(treated).toHaveLength(6);
            expect(treated.every((p: any) => p.tratamientoProlongado === 6)).toBe(true);
            expect(untreated).toHaveLength(1);
            expect((untreated[0] as any).tratamientoProlongado).toBeUndefined();
        });

        it('allows a prolonged treatment with magistral medication', async () => {
            await service.create({
                patient,
                professional,
                supplies: [{ supply: { name: 'Magistral X', type: 'magistral' }, quantity: 1 }],
                tratamientoProlongado: 3,
            });

            const all = await Prescription.find({}).exec();
            expect(all).toHaveLength(3);
        });

        it('normalizes legacy trimestral records to tratamientoProlongado 3 on read', async () => {
            const legacy = await Prescription.create({
                patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
                professional,
                supplies: medications,
                status: 'Pendiente',
                date: new Date(),
                trimestral: true,
            });

            const fetched = await service.show(legacy._id.toString());
            expect((fetched as any).tratamientoProlongado).toBe(3);
        });
    });

    describe('magistral', () => {
        const patient = { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' };
        const magistralSupply = { supply: { name: 'Magistral X', type: 'magistral' }, quantity: 1 };

        it('creates a magistral in a public ambito', async () => {
            const result = await service.create({
                patient,
                professional: { userId: '000000000000000000000001', businessName: 'Dr. Gómez' },
                supplies: [magistralSupply],
                ambito: 'publico',
                organizacion: { _id: 'org-public', nombre: 'Hospital Público' },
            });

            expect(result).toBeDefined();
            expect(result.ambito).toBe('publico');
        });

        it('creates a magistral in a private ambito (manual)', async () => {
            const result = await service.create({
                patient,
                professional: { userId: '000000000000000000000001', businessName: 'Dr. Gómez' },
                supplies: [{ supply: { name: 'Magistral manual', type: 'magistral' }, quantity: 1 }],
                ambito: 'privado',
                organizacion: { _id: 'org-private', nombre: 'Clínica Privada' },
            });

            expect(result).toBeDefined();
            expect(result.ambito).toBe('privado');
        });

        it('creates commercial supplies without any ambito restriction', async () => {
            const result = await service.create({
                patient,
                professional: { userId: '000000000000000000000001', businessName: 'Dr. Gómez' },
                supplies: [{ supply: { name: 'Ibuprofeno 400mg', type: 'device' }, quantity: 1 }],
                ambito: 'privado',
            });

            expect(result).toBeDefined();
        });
    });

    describe('update', () => {
        it('updates pending prescription', async () => {
            const created = await createTestPrescription();
            const result = await service.update(created._id.toString(), { date: '2024-06-01' });
            expect(result).toBeDefined();
        });

        it('throws on non-pending prescription', async () => {
            const created = await createTestPrescription({ status: 'Dispensada' });
            await expect(service.update(created._id.toString(), { date: '2024-06-01' })).rejects.toThrow(PrescriptionNotDispensableError);
        });
    });

    describe('delete', () => {
        it('deletes pending prescription', async () => {
            const created = await createTestPrescription();
            await service.delete(created._id.toString());
            await expect(service.show(created._id.toString())).rejects.toThrow(PrescriptionNotFoundError);
        });

        it('throws on non-pending prescription', async () => {
            const created = await createTestPrescription({ status: 'Dispensada' });
            await expect(service.delete(created._id.toString())).rejects.toThrow(PrescriptionNotDispensableError);
        });
    });

    describe('dispense', () => {
        it('dispenses a pending prescription', async () => {
            const created = await createTestPrescription();
            const result = await service.dispense(created._id.toString(), {
                userId: '000000000000000000000003',
                businessName: 'Farm. López',
                cuil: '20-12345678-9',
            });
            expect(result.status).toBe('Dispensada');
            expect(result.dispensedBy?.businessName).toBe('Farm. López');
        });

        it('throws on non-pending prescription', async () => {
            const created = await createTestPrescription({ status: 'Vencida' });
            await expect(service.dispense(created._id.toString(), {
                userId: '000000000000000000000003', businessName: 'Test',
            })).rejects.toThrow(PrescriptionNotDispensableError);
        });
    });

    describe('cancelDispense', () => {
        it('cancels dispense within 2 hours', async () => {
            const created = await createTestPrescription({
                status: 'Dispensada',
                dispensedBy: { userId: '000000000000000000000003', businessName: 'Farm. López' },
                dispensedAt: new Date(),
            });
            const result = await service.cancelDispense(created._id.toString(), '000000000000000000000003');
            expect(result.status).toBe('Pendiente');
        });

        it('throws on non-dispensada prescription', async () => {
            const created = await createTestPrescription({ status: 'Pendiente' });
            await expect(service.cancelDispense(created._id.toString(), 'test')).rejects.toThrow();
        });

        it('throws when 2 hours exceeded (non-admin)', async () => {
            const oldDate = new Date();
            oldDate.setHours(oldDate.getHours() - 3);
            const created = await createTestPrescription({
                status: 'Dispensada',
                dispensedBy: { userId: '000000000000000000000003', businessName: 'Farm. López' },
                dispensedAt: oldDate,
            });
            await expect(service.cancelDispense(created._id.toString(), '000000000000000000000003', false)).rejects.toThrow(PrescriptionCancelTimeExceededError);
        });

        it('allows cancel after 2 hours for admin', async () => {
            const oldDate = new Date();
            oldDate.setHours(oldDate.getHours() - 3);
            const created = await createTestPrescription({
                status: 'Dispensada',
                dispensedBy: { userId: '000000000000000000000003', businessName: 'Farm. López' },
                dispensedAt: oldDate,
            });
            const result = await service.cancelDispense(created._id.toString(), '000000000000000000000003', true);
            expect(result.status).toBe('Pendiente');
        });
    });

    describe('expireOldPrescriptions', () => {
        it('expires prescriptions older than 30 days', async () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 31);
            await createTestPrescription({ date: oldDate });

            const count = await repo.expireOldPrescriptions();
            expect(count).toBe(1);
        });
    });

    describe('getByUserId', () => {
        it('returns prescriptions for a professional', async () => {
            await createTestPrescription({ professional: { userId: '000000000000000000000001', businessName: 'Dr.' } });
            await createTestPrescription({ professional: { userId: '000000000000000000000002', businessName: 'Dr.' } });

            const result = await service.getByUserId('000000000000000000000001');
            expect(result.prescriptions).toHaveLength(1);
            expect(result.total).toBe(1);
        });
    });

    describe('getDispensedByCuil', () => {
        it('returns dispensed prescriptions by cuil (with separators)', async () => {
            (usersStub.findByCuilOrUsername as jest.Mock).mockResolvedValueOnce([]);
            await createTestPrescription({
                status: 'Dispensada',
                dispensedBy: { cuil: '20-12345678-9', userId: '000000000000000000000003', businessName: 'Farm.' },
            });
            await createTestPrescription({ status: 'Pendiente' });

            const result = await service.getDispensedByCuil('20123456789');
            expect(result.prescriptions).toHaveLength(1);
            expect(result.total).toBe(1);
            expect(result.dispenser?.businessName).toBe('Farm.');
        });

        it('returns dispensed prescriptions resolved by user id when cuil is missing', async () => {
            const userId = new mongoose.Types.ObjectId('000000000000000000000009');
            (usersStub.findByCuilOrUsername as jest.Mock).mockResolvedValueOnce([
                { _id: userId, businessName: 'Farmacia Test', cuil: '20123456789', email: 'farm@test.com' },
            ]);
            await createTestPrescription({
                status: 'Dispensada',
                dispensedBy: { userId, businessName: 'Farm.' },
            });
            await createTestPrescription({ status: 'Pendiente' });

            const result = await service.getDispensedByCuil('20123456789');
            expect(result.prescriptions).toHaveLength(1);
            expect(result.total).toBe(1);
            expect(result.dispenser?.businessName).toBe('Farmacia Test');
            expect(result.dispenser?.email).toBe('farm@test.com');
        });
    });
});
