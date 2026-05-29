import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PracticeRepository } from '../../../src/modules/practices/practices.repository';
import { PracticeService } from '../../../src/modules/practices/practices.service';
import { PracticeNotFoundError } from '../../../src/modules/practices/practices.errors';

jest.setTimeout(15000);

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

let repository: PracticeRepository;
let service: PracticeService;

beforeAll(async () => {
    await connectTestDB();
    repository = new PracticeRepository();
    service = new PracticeService(repository, logger as any);
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

describe('PracticeService', () => {
    const practiceData = {
        date: '2025-01-15',
        patient: {
            firstName: 'Juan',
            lastName: 'Perez',
            dni: '12345678',
            sex: 'masculino',
        },
        professional: {
            userId: '000000000000000000000001',
        },
    };

    describe('index', () => {
        it('returns empty list when no practices', async () => {
            const result = await service.index(0, 20);
            expect(result.practices).toEqual([]);
            expect(result.total).toBe(0);
        });

        it('returns paginated practices', async () => {
            await service.create(practiceData);
            const result = await service.index(0, 20);
            expect(result.practices).toHaveLength(1);
            expect(result.total).toBe(1);
        });
    });

    describe('show', () => {
        it('returns practice by id', async () => {
            const created = await service.create(practiceData);
            const result = await service.show(created._id.toString());
            expect(result.patient.firstName).toBe('Juan');
        });

        it('throws PracticeNotFoundError for non-existent id', async () => {
            await expect(service.show('000000000000000000000000')).rejects.toThrow(PracticeNotFoundError);
        });
    });

    describe('create', () => {
        it('creates a practice', async () => {
            const result = await service.create(practiceData);
            expect(result.patient.firstName).toBe('Juan');
            expect(result.professional.userId).toBe('000000000000000000000001');
        });
    });

    describe('update', () => {
        it('updates practice fields', async () => {
            const created = await service.create(practiceData);
            const updated = await service.update(created._id.toString(), { diagnostic: 'Nuevo diagnóstico' });
            expect(updated.diagnostic).toBe('Nuevo diagnóstico');
        });

        it('throws PracticeNotFoundError for non-existent id', async () => {
            await expect(service.update('000000000000000000000000', { diagnostic: 'X' })).rejects.toThrow(PracticeNotFoundError);
        });
    });

    describe('delete', () => {
        it('deletes existing practice', async () => {
            const created = await service.create(practiceData);
            await service.delete(created._id.toString());
            await expect(service.show(created._id.toString())).rejects.toThrow(PracticeNotFoundError);
        });

        it('throws PracticeNotFoundError for non-existent id', async () => {
            await expect(service.delete('000000000000000000000000')).rejects.toThrow(PracticeNotFoundError);
        });
    });

    describe('getByUserId', () => {
        it('returns practices for user', async () => {
            await service.create(practiceData);
            const result = await service.getByUserId('000000000000000000000001', 0, 20);
            expect(result.practices).toHaveLength(1);
            expect(result.total).toBe(1);
        });

        it('returns empty array when no practices for user', async () => {
            const result = await service.getByUserId('000000000000000000000002', 0, 20);
            expect(result.practices).toEqual([]);
            expect(result.total).toBe(0);
        });
    });

    describe('searchByUserId', () => {
        it('returns practices matching search term', async () => {
            await service.create(practiceData);
            const result = await service.searchByUserId('000000000000000000000001', 'Juan', 0, 20);
            expect(result.practices).toHaveLength(1);
        });

        it('returns empty when no match', async () => {
            await service.create(practiceData);
            const result = await service.searchByUserId('000000000000000000000001', 'zzzzz', 0, 20);
            expect(result.practices).toEqual([]);
        });
    });
});
