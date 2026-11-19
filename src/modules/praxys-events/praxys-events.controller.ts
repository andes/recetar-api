import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../shared/api-response';
import { PraxysEventsService } from './praxys-events.service';
import { PraxysEventoDispensa, PraxysEventoPrescripcion } from './praxys-events.types';

export class PraxysEventsController {
    constructor(private readonly praxysEventsService: PraxysEventsService) {}

    createPrescription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.praxysEventsService.handlePrescription(
                req.body as PraxysEventoPrescripcion,
            );
            res.status(result.duplicate ? 200 : 201).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    annulPrescription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.praxysEventsService.annulPrescription(req.params.hash);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    annulReceta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.praxysEventsService.annulReceta(req.params.hash);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    dispense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.praxysEventsService.dispense(
                req.params.hash,
                req.body as PraxysEventoDispensa,
            );
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    annulDispense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.praxysEventsService.annulDispense(req.params.hash);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };
}
