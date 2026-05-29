import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { ProfessionalRepository } from '../../../src/modules/professionals/professionals.repository';
import { ProfessionalService } from '../../../src/modules/professionals/professionals.service';
import { ProfessionalNotFoundError } from '../../../src/modules/professionals/professionals.errors';

jest.setTimeout(15000);

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

let repository: ProfessionalRepository;
let service: ProfessionalService;

beforeAll(async () => {
    await connectTestDB();
    repository = new ProfessionalRepository();
    service = new ProfessionalService(repository, logger as any);
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

describe('ProfessionalService', () => {
    const professionalData = {
        enrollment: 'MAT001',
        lastName: 'Gómez',
        firstName: 'Carlos',
    };

    describe('index', () => {
        it('returns empty list when no professionals', async () => {
            const result = await service.index(0, 20);
            expect(result).toEqual([]);
        });

        it('returns paginated professionals', async () => {
            await service.create(professionalData);
            await service.create({ enrollment: 'MAT002', lastName: 'Pérez', firstName: 'María' });

            const result = await service.index(0, 1);
            expect(result).toHaveLength(1);
        });
    });

    describe('show', () => {
        it('returns professional by id', async () => {
            const created = await service.create(professionalData);

            const result = await service.show(created._id.toString());
            expect(result.enrollment).toBe('MAT001');
        });

        it('throws ProfessionalNotFoundError for non-existent id', async () => {
            await expect(service.show('000000000000000000000000')).rejects.toThrow(ProfessionalNotFoundError);
        });
    });

    describe('findByDni', () => {
        it('returns professionals matching dni', async () => {
            await service.create({ ...professionalData, dni: '12345678' });

            const result = await service.findByDni('12345678');
            expect(result).toHaveLength(1);
        });

        it('returns empty array when no match', async () => {
            const result = await service.findByDni('99999999');
            expect(result).toEqual([]);
        });
    });

    describe('create', () => {
        it('creates a professional', async () => {
            const result = await service.create(professionalData);
            expect(result.enrollment).toBe('MAT001');
            expect(result.lastName).toBe('Gómez');
            expect(result.firstName).toBe('Carlos');
        });
    });

    describe('update', () => {
        it('updates professional fields', async () => {
            const created = await service.create(professionalData);

            const updated = await service.update(created._id.toString(), { firstName: 'Carlos Alberto' });
            expect(updated.firstName).toBe('Carlos Alberto');
        });

        it('throws ProfessionalNotFoundError for non-existent id', async () => {
            await expect(service.update('000000000000000000000000', { firstName: 'X' })).rejects.toThrow(ProfessionalNotFoundError);
        });
    });

    describe('delete', () => {
        it('deletes existing professional', async () => {
            const created = await service.create(professionalData);

            await service.delete(created._id.toString());
            await expect(service.show(created._id.toString())).rejects.toThrow(ProfessionalNotFoundError);
        });

        it('throws ProfessionalNotFoundError for non-existent id', async () => {
            await expect(service.delete('000000000000000000000000')).rejects.toThrow(ProfessionalNotFoundError);
        });
    });
});
