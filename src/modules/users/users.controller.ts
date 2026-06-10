import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { ApiResponse } from '../../shared/api-response';
import { getStringQueryParam } from '../../shared/utils/query';

export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const searchTerm = getStringQueryParam(req.query.searchTerm);
            const offset = parseInt(getStringQueryParam(req.query.offset) || '0', 10);
            const limit = parseInt(getStringQueryParam(req.query.limit) || '10', 10);
            const result = await this.usersService.index({ searchTerm, offset, limit });
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    show = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.usersService.getById(req.params.id);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.usersService.create(req.body, req.user as any);
            res.status(201).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.usersService.update(req.params.id, req.body, req.user as any);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    updateOwnOrganizaciones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as any)._id.toString();
            const result = await this.usersService.updateOwnOrganizaciones(userId, req.body.organizaciones);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    requestEmailUpdate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as any)._id.toString();
            const result = await this.usersService.requestEmailUpdate(userId, req.body.email);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    confirmEmailUpdate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.usersService.confirmEmailUpdate(req.body.token);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    organizacionesAndes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const nombre = getStringQueryParam(req.query.nombre);
            if (!nombre) {
                res.status(400).json(ApiResponse.error('VALIDATION_ERROR', 'Parámetro nombre es requerido'));
                return;
            }
            const result = await this.usersService.organizacionesAndes(nombre);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}
