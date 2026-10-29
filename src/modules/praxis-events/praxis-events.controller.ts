import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../shared/api-response';
import { PraxisEventsService } from './praxis-events.service';
import { PraxisEventoDispensa, PraxisEventoPrescripcion } from './praxis-events.types';

export class PraxisEventsController {
    constructor(private readonly praxisEventsService: PraxisEventsService) {}

    createPrescription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.praxisEventsService.handlePrescription(
                req.body as PraxisEventoPrescripcion,
            );
            res.status(result.duplicate ? 200 : 201).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    annulPrescription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.praxisEventsService.annulPrescription(req.params.hash);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    annulReceta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.praxisEventsService.annulReceta(req.params.hash);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    dispense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.praxisEventsService.dispense(
                req.params.hash,
                req.body as PraxisEventoDispensa,
            );
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    annulDispense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.praxisEventsService.annulDispense(req.params.hash);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };
}
