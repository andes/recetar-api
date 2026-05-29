import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PharmacistRepository } from '../../../src/modules/pharmacists/pharmacists.repository';
import { PharmacistService } from '../../../src/modules/pharmacists/pharmacists.service';
import { PharmacistNotFoundError, PharmacyNotFoundError } from '../../../src/modules/pharmacists/pharmacists.errors';
import Pharmacy from '../../../src/modules/pharmacists/pharmacy.model';

jest.setTimeout(15000);

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

let repository: PharmacistRepository;
let service: PharmacistService;

beforeAll(async () => {
    await connectTestDB();
    repository = new PharmacistRepository();
    service = new PharmacistService(repository, logger as any);
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

describe('PharmacistService', () => {
    const pharmacistData = {
        enrollment: 'FARM001',
        lastName: 'López',
        firstName: 'María',
        sex: 'Femenino' as const,
    };

    describe('index', () => {
        it('returns empty list when no pharmacists', async () => {
            const result = await service.index();
            expect(result).toEqual([]);
        });

        it('returns all pharmacists', async () => {
            await service.create(pharmacistData);
            await service.create({ enrollment: 'FARM002', lastName: 'Pérez', firstName: 'Ana', sex: 'Masculino' });

            const result = await service.index();
            expect(result).toHaveLength(2);
        });
    });

    describe('show', () => {
        it('returns pharmacist by id', async () => {
            const created = await service.create(pharmacistData);

            const result = await service.show(created._id.toString());
            expect(result.enrollment).toBe('FARM001');
        });

        it('throws PharmacistNotFoundError for non-existent id', async () => {
            await expect(service.show('000000000000000000000000')).rejects.toThrow(PharmacistNotFoundError);
        });
    });

    describe('create', () => {
        it('creates a pharmacist', async () => {
            const result = await service.create(pharmacistData);
            expect(result.enrollment).toBe('FARM001');
            expect(result.firstName).toBe('María');
        });
    });

    describe('update', () => {
        it('updates pharmacist fields', async () => {
            const created = await service.create(pharmacistData);

            const updated = await service.update(created._id.toString(), { firstName: 'Ana María' });
            expect(updated.firstName).toBe('Ana María');
        });

        it('throws PharmacistNotFoundError for non-existent id', async () => {
            await expect(service.update('000000000000000000000000', { firstName: 'X' })).rejects.toThrow(PharmacistNotFoundError);
        });
    });

    describe('delete', () => {
        it('deletes existing pharmacist', async () => {
            const created = await service.create(pharmacistData);

            await service.delete(created._id.toString());
            await expect(service.show(created._id.toString())).rejects.toThrow(PharmacistNotFoundError);
        });

        it('throws PharmacistNotFoundError for non-existent id', async () => {
            await expect(service.delete('000000000000000000000000')).rejects.toThrow(PharmacistNotFoundError);
        });
    });

    describe('indexPharmacies', () => {
        it('returns empty list when no pharmacies', async () => {
            const result = await service.indexPharmacies();
            expect(result).toEqual([]);
        });

        it('returns all pharmacies', async () => {
            const pharmacist = await service.create(pharmacistData);
            await service.createPharmacy({
                cuit: '30-12345678-9',
                name: 'Farmacia Central',
                city: 'Ciudad',
                pharmacist: pharmacist._id.toString(),
            });

            const result = await service.indexPharmacies();
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Farmacia Central');
        });
    });

    describe('showPharmacy', () => {
        it('returns pharmacy by id', async () => {
            const pharmacist = await service.create(pharmacistData);
            const created = await service.createPharmacy({
                cuit: '30-12345678-9',
                name: 'Farmacia Central',
                city: 'Ciudad',
                pharmacist: pharmacist._id.toString(),
            });

            const result = await service.showPharmacy(created._id.toString());
            expect(result.name).toBe('Farmacia Central');
        });

        it('throws PharmacyNotFoundError for non-existent id', async () => {
            await expect(service.showPharmacy('000000000000000000000000')).rejects.toThrow(PharmacyNotFoundError);
        });
    });

    describe('createPharmacy', () => {
        it('creates a pharmacy', async () => {
            const pharmacist = await service.create(pharmacistData);

            const result = await service.createPharmacy({
                cuit: '30-12345678-9',
                name: 'Farmacia Central',
                city: 'Ciudad',
                pharmacist: pharmacist._id.toString(),
            });

            expect(result.cuit).toBe('30-12345678-9');
        });
    });

    describe('updatePharmacy', () => {
        it('updates pharmacy fields', async () => {
            const pharmacist = await service.create(pharmacistData);
            const created = await service.createPharmacy({
                cuit: '30-12345678-9',
                name: 'Farmacia Central',
                city: 'Ciudad',
                pharmacist: pharmacist._id.toString(),
            });

            const updated = await service.updatePharmacy(created._id.toString(), { name: 'Farmacia Sur' });
            expect(updated.name).toBe('Farmacia Sur');
        });

        it('throws PharmacyNotFoundError for non-existent id', async () => {
            await expect(service.updatePharmacy('000000000000000000000000', { name: 'X' })).rejects.toThrow(PharmacyNotFoundError);
        });
    });

    describe('deletePharmacy', () => {
        it('deletes existing pharmacy', async () => {
            const pharmacist = await service.create(pharmacistData);
            const created = await service.createPharmacy({
                cuit: '30-12345678-9',
                name: 'Farmacia Central',
                city: 'Ciudad',
                pharmacist: pharmacist._id.toString(),
            });

            await service.deletePharmacy(created._id.toString());
            await expect(service.showPharmacy(created._id.toString())).rejects.toThrow(PharmacyNotFoundError);
        });

        it('throws PharmacyNotFoundError for non-existent id', async () => {
            await expect(service.deletePharmacy('000000000000000000000000')).rejects.toThrow(PharmacyNotFoundError);
        });
    });
});
