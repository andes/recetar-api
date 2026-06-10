import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { SupplyRepository } from '../../../src/modules/supplies/supplies.repository';
import { SupplyService } from '../../../src/modules/supplies/supplies.service';
import { SupplyNotFoundError } from '../../../src/modules/supplies/supplies.errors';
import { AndesClient } from '../../../src/integrations/andes';

jest.setTimeout(15000);

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

let repository: SupplyRepository;
let service: SupplyService;
const andesClient = new AndesClient();

beforeAll(async () => {
    await connectTestDB();
    repository = new SupplyRepository();
    service = new SupplyService(repository, logger as any, andesClient);
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

describe('SupplyService', () => {
    const supplyData = { name: 'Ibuprofeno 400mg' };

    describe('index', () => {
        it('returns empty list when no supplies', async () => {
            const result = await service.index(0, 20);
            expect(result).toEqual([]);
        });

        it('returns paginated supplies', async () => {
            await service.create(supplyData);
            await service.create({ name: 'Paracetamol 500mg' });

            const result = await service.index(0, 1);
            expect(result).toHaveLength(1);
        });
    });

    describe('show', () => {
        it('returns supply by id', async () => {
            const created = await service.create(supplyData);

            const result = await service.show(created._id.toString());
            expect(result.name).toBe('Ibuprofeno 400mg');
        });

        it('throws SupplyNotFoundError for non-existent id', async () => {
            await expect(service.show('000000000000000000000000')).rejects.toThrow(SupplyNotFoundError);
        });
    });

    describe('search', () => {
        it('returns supplies matching name', async () => {
            await service.create(supplyData);
            await service.create({ name: 'Paracetamol 500mg' });

            const result = await service.search('ibuprofeno');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Ibuprofeno 400mg');
        });

        it('returns empty array when no match', async () => {
            const result = await service.search('zzzzz');
            expect(result).toEqual([]);
        });
    });

    describe('create', () => {
        it('creates a supply', async () => {
            const result = await service.create(supplyData);
            expect(result.name).toBe('Ibuprofeno 400mg');
        });
    });

    describe('update', () => {
        it('updates supply fields', async () => {
            const created = await service.create(supplyData);

            const updated = await service.update(created._id.toString(), { name: 'Ibuprofeno 600mg' });
            expect(updated.name).toBe('Ibuprofeno 600mg');
        });

        it('throws SupplyNotFoundError for non-existent id', async () => {
            await expect(service.update('000000000000000000000000', { name: 'X' })).rejects.toThrow(SupplyNotFoundError);
        });
    });

    describe('delete', () => {
        it('deletes existing supply', async () => {
            const created = await service.create(supplyData);

            await service.delete(created._id.toString());
            await expect(service.show(created._id.toString())).rejects.toThrow(SupplyNotFoundError);
        });

        it('throws SupplyNotFoundError for non-existent id', async () => {
            await expect(service.delete('000000000000000000000000')).rejects.toThrow(SupplyNotFoundError);
        });
    });

    describe('searchSnomedConcepts', () => {
        it('throws config error when andes is not configured', async () => {
            await expect(service.searchSnomedConcepts('ibuprofeno')).rejects.toThrow('ANDES_ENDPOINT y JWT_MPI_TOKEN deben estar configurados');
        });
    });
});
