import { Request, Response, NextFunction } from 'express';
import { PracticeService } from './practices.service';
import { ApiResponse } from '../../shared/api-response';
import { CreatePracticeDTO, UpdatePracticeDTO } from './practices.dto';
import { IPractice } from './practices.types';
import { getStringQueryParam } from '../../shared/utils/query';

export class PracticeController {
    constructor(private readonly practiceService: PracticeService) {}

    index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const skip = parseInt(getStringQueryParam(req.query.skip) || '0', 10);
            const limit = parseInt(getStringQueryParam(req.query.limit) || '20', 10);
            const userId = getStringQueryParam(req.query.userId);
            const searchTerm = getStringQueryParam(req.query.searchTerm);

            let result: { practices: IPractice[]; total: number };
            if (userId && searchTerm) {
                result = await this.practiceService.searchByUserId(userId, searchTerm, skip, limit);
            } else if (userId) {
                result = await this.practiceService.getByUserId(userId, skip, limit);
            } else {
                result = await this.practiceService.index(skip, limit);
            }

            res.status(200).json(ApiResponse.success({ practices: result.practices, total: result.total, offset: skip, limit }));
        } catch (error) {
            next(error);
        }
    };

    show = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const practice = await this.practiceService.show(req.params.id);
            res.status(200).json(ApiResponse.success(practice));
        } catch (error) {
            next(error);
        }
    };

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const practice = await this.practiceService.create(req.body as CreatePracticeDTO);
            res.status(201).json(ApiResponse.success(practice));
        } catch (error) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const practice = await this.practiceService.update(req.params.id, req.body as UpdatePracticeDTO);
            res.status(200).json(ApiResponse.success(practice));
        } catch (error) {
            next(error);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.practiceService.delete(req.params.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}
