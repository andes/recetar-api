import { Request, Response, NextFunction } from 'express';
import { StockService } from './stock.service';
import { ApiResponse } from '../../shared/api-response';
import { getStringQueryParam } from '../../shared/utils/query';

export class StockController {
    constructor(private readonly stockService: StockService) {}

    index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const skip = parseInt(getStringQueryParam(req.query.skip) || '0', 10);
            const limit = parseInt(getStringQueryParam(req.query.limit) || '100', 10);
            const result = await this.stockService.index(skip, limit);
            res.status(200).json(ApiResponse.success({ stock: result.stock, total: result.total, offset: skip, limit }));
        } catch (error) {
            next(error);
        }
    };

    getAndesStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const insumo = getStringQueryParam(req.query.insumo);
            const tipos = getStringQueryParam(req.query.tipos);
            const result = await this.stockService.getAndesStock(insumo, tipos);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };
}
