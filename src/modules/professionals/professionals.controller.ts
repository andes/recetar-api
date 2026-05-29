import { Request, Response, NextFunction } from 'express';
import { ProfessionalService } from './professionals.service';
import { ApiResponse } from '../../shared/api-response';
import { CreateProfessionalDTO, UpdateProfessionalDTO } from './professionals.dto';
import { getStringQueryParam } from '../../shared/utils/query';

export class ProfessionalController {
    constructor(private readonly professionalService: ProfessionalService) {}

    index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const skip = parseInt(getStringQueryParam(req.query.skip) || '0', 10);
            const limit = parseInt(getStringQueryParam(req.query.limit) || '20', 10);
            const professionals = await this.professionalService.index(skip, limit);
            res.status(200).json(ApiResponse.success(professionals));
        } catch (error) {
            next(error);
        }
    };

    show = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const professional = await this.professionalService.show(req.params.id);
            res.status(200).json(ApiResponse.success(professional));
        } catch (error) {
            next(error);
        }
    };

    findByDni = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const professionals = await this.professionalService.findByDni(req.params.dni);
            res.status(200).json(ApiResponse.success(professionals));
        } catch (error) {
            next(error);
        }
    };

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const professional = await this.professionalService.create(req.body as CreateProfessionalDTO);
            res.status(201).json(ApiResponse.success(professional));
        } catch (error) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const professional = await this.professionalService.update(req.params.id, req.body as UpdateProfessionalDTO);
            res.status(200).json(ApiResponse.success(professional));
        } catch (error) {
            next(error);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.professionalService.delete(req.params.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}
