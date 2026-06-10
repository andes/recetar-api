import mongoose from 'mongoose';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PrescriptionRepository } from '../../../src/modules/prescriptions/prescription.repository';
import { PrescriptionAndesRepository } from '../../../src/integrations/andes';
import { PrescriptionService } from '../../../src/modules/prescriptions/prescription.service';
import { AndesClient } from '../../../src/integrations/andes';
import {
    PrescriptionNotFoundError,
    PrescriptionNotDispensableError,
    PrescriptionAlreadyDispensedError,
    PrescriptionCancelTimeExceededError,
} from '../../../src/modules/prescriptions/prescription.errors';

jest.setTimeout(15000);

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const mockAndesClient = new AndesClient();

const PrescriptionSchema = new mongoose.Schema({
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
    service = new PrescriptionService(repo, andesRepo, mockAndesClient, logger as any);
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
        professional: { userId: 'prof123', businessName: 'Dr. Gómez' },
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
                professional: { userId: 'prof123', businessName: 'Dr. Gómez' },
                supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 10 }],
                ambito: 'privado',
            });
            expect(result.patient.firstName).toBe('Juan');
            expect(result.status).toBe('Pendiente');
            expect(result.prescriptionId).toBeDefined();
        });

        it('creates trimestral prescriptions', async () => {
            const result = await service.create({
                patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
                professional: { userId: 'prof123', businessName: 'Dr. Gómez' },
                supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 10 }],
                trimestral: true,
            });
            expect(result).toBeDefined();

            const all = await Prescription.find({}).exec();
            expect(all.length).toBeGreaterThanOrEqual(3);
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
                userId: 'farm123',
                businessName: 'Farm. López',
                cuil: '20-12345678-9',
            });
            expect(result.status).toBe('Dispensada');
            expect(result.dispensedBy?.businessName).toBe('Farm. López');
        });

        it('throws on non-pending prescription', async () => {
            const created = await createTestPrescription({ status: 'Vencida' });
            await expect(service.dispense(created._id.toString(), {
                userId: 'farm123', businessName: 'Test',
            })).rejects.toThrow(PrescriptionNotDispensableError);
        });
    });

    describe('cancelDispense', () => {
        it('cancels dispense within 2 hours', async () => {
            const created = await createTestPrescription({
                status: 'Dispensada',
                dispensedBy: { userId: 'farm123', businessName: 'Farm. López' },
                dispensedAt: new Date(),
            });
            const result = await service.cancelDispense(created._id.toString(), 'farm123');
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
                dispensedBy: { userId: 'farm123', businessName: 'Farm. López' },
                dispensedAt: oldDate,
            });
            await expect(service.cancelDispense(created._id.toString(), 'farm123', false)).rejects.toThrow(PrescriptionCancelTimeExceededError);
        });

        it('allows cancel after 2 hours for admin', async () => {
            const oldDate = new Date();
            oldDate.setHours(oldDate.getHours() - 3);
            const created = await createTestPrescription({
                status: 'Dispensada',
                dispensedBy: { userId: 'farm123', businessName: 'Farm. López' },
                dispensedAt: oldDate,
            });
            const result = await service.cancelDispense(created._id.toString(), 'farm123', true);
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
            await createTestPrescription({ professional: { userId: 'prof123', businessName: 'Dr.' } });
            await createTestPrescription({ professional: { userId: 'prof456', businessName: 'Dr.' } });

            const result = await service.getByUserId('prof123');
            expect(result.prescriptions).toHaveLength(1);
            expect(result.total).toBe(1);
        });
    });

    describe('getDispensedByCuil', () => {
        it('returns dispensed prescriptions by cuil', async () => {
            await createTestPrescription({
                status: 'Dispensada',
                dispensedBy: { cuil: '20-12345678-9', userId: 'farm123', businessName: 'Farm.' },
            });
            await createTestPrescription({ status: 'Pendiente' });

            const result = await service.getDispensedByCuil('20-12345678-9');
            expect(result.prescriptions).toHaveLength(1);
            expect(result.total).toBe(1);
        });
    });
});
