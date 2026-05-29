import mongoose from 'mongoose';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { StockRepository } from '../../../src/modules/stock/stock.repository';
import { StockService } from '../../../src/modules/stock/stock.service';
import { AndesClient } from '../../../src/integrations/andes';

const PrescriptionSchema = new mongoose.Schema({
    supplies: [{
        _id: false,
        supply: {
            name: { type: String },
            type: { type: String, enum: ['device', 'nutrition', 'magistral'] },
        },
        quantity: Number,
    }],
    date: { type: Date, default: Date.now },
}, { strict: false, timestamps: true });

const Prescription = mongoose.models.Prescription
    || mongoose.model('Prescription', PrescriptionSchema);

jest.setTimeout(15000);

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const mockAndesClient = new AndesClient();

let repository: StockRepository;
let service: StockService;

function createPrescriptionWithSupplies(overrides = {}) {
    return Prescription.create({
        patient: { firstName: 'Test', lastName: 'Paciente', dni: '12345678', sex: 'Masculino' },
        professional: { businessName: 'Dr. Test' },
        supplies: [{
            supply: { name: 'Ibuprofeno 400mg', type: 'device' },
            quantity: 10,
        }],
        date: new Date(),
        status: 'Pendiente',
        ...overrides,
    });
}

beforeAll(async () => {
    await connectTestDB();
    repository = new StockRepository();
    service = new StockService(repository, mockAndesClient, logger as any);
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

describe('StockService', () => {
    describe('index', () => {
        it('returns empty list when no prescriptions with supplies', async () => {
            const result = await service.index(0, 100);
            expect(result.stock).toEqual([]);
            expect(result.total).toBe(0);
        });

        it('returns prescriptions with supplies', async () => {
            await createPrescriptionWithSupplies();

            const result = await service.index(0, 100);
            expect(result.stock).toHaveLength(1);
            expect(result.total).toBe(1);
        });

        it('excludes prescriptions without supplies', async () => {
            await createPrescriptionWithSupplies();
            await Prescription.create({
                patient: { firstName: 'Test', lastName: 'Otro', dni: '12345678', sex: 'Masculino' },
                professional: { businessName: 'Dr. Test' },
                date: new Date(),
                status: 'Pendiente',
            });

            const result = await service.index(0, 100);
            expect(result.stock).toHaveLength(1);
            expect(result.total).toBe(1);
        });

        it('respects pagination', async () => {
            await createPrescriptionWithSupplies({ date: new Date('2024-01-01') });
            await createPrescriptionWithSupplies({ date: new Date('2024-01-02') });

            const result = await service.index(0, 1);
            expect(result.stock).toHaveLength(1);
            expect(result.total).toBe(2);
        });
    });

    describe('getAndesStock', () => {
        it('calls getAllStock when no insumo param', async () => {
            await expect(service.getAndesStock()).rejects.toThrow();
        });

        it('calls searchStock when insumo param provided', async () => {
            await expect(service.getAndesStock('ibuprofeno')).rejects.toThrow();
        });
    });
});
