import { StockRepository } from './stock.repository';
import { AndesClient } from '../../integrations/andes';
import { Logger } from '../../shared/logger/logger.interface';
import { AndesStockItem } from '../../integrations/andes/andes.types';

export class StockService {
    constructor(
        private readonly stockRepository: StockRepository,
        private readonly andesClient: AndesClient,
        private readonly logger: Logger,
    ) {}

    async index(skip = 0, limit = 100): Promise<{ stock: unknown[]; total: number }> {
        return this.stockRepository.findAllWithSupplies(skip, limit);
    }

    async getAndesStock(insumo?: string, tipos?: string): Promise<AndesStockItem[]> {
        if (insumo) {
            return this.andesClient.searchStock(insumo, tipos);
        }
        return this.andesClient.getAllStock();
    }
}
