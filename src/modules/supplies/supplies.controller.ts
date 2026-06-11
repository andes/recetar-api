import { Request, Response, NextFunction } from 'express';
import { SupplyService } from './supplies.service';
import { ApiResponse } from '../../shared/api-response';
import { CreateSupplyDTO, UpdateSupplyDTO } from './supplies.dto';

export class SupplyController {
    constructor(private readonly supplyService: SupplyService) {}

    index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const name = req.query.name as string | undefined;
            if (name) {
                const results = await this.supplyService.search(name);
                res.status(200).json(ApiResponse.success(results));
                return;
            }
            const skip = parseInt(req.query.skip as string, 10) || 0;
            const limit = parseInt(req.query.limit as string, 10) || 20;
            const supplies = await this.supplyService.index(skip, limit);
            res.status(200).json(ApiResponse.success(supplies));
        } catch (error) {
            next(error);
        }
    };

    show = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const supply = await this.supplyService.show(req.params.id);
            res.status(200).json(ApiResponse.success(supply));
        } catch (error) {
            next(error);
        }
    };

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const supply = await this.supplyService.create(req.body as CreateSupplyDTO);
            res.status(201).json(ApiResponse.success(supply));
        } catch (error) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const supply = await this.supplyService.update(req.params.id, req.body as UpdateSupplyDTO);
            res.status(200).json(ApiResponse.success(supply));
        } catch (error) {
            next(error);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.supplyService.delete(req.params.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    searchSnomed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const search = req.query.search as string | undefined;
            if (!search) {
                res.status(400).json(ApiResponse.error('VALIDATION_ERROR', 'Parámetro search es requerido'));
                return;
            }
            const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);
            const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
            const result = await this.supplyService.searchSnomedConcepts(search, offset, limit);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };
}
