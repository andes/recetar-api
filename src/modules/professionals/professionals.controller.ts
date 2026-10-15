import { Request, Response, NextFunction } from 'express';
import { ProfessionalService } from './professionals.service';
import { ApiResponse } from '../../shared/api-response';
import { ProfessionalNotFoundError } from './professionals.errors';

export class ProfessionalController {
    constructor(private readonly professionalService: ProfessionalService) {}

    me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as { _id?: { toString(): string } })?._id?.toString();
            const professional = userId ? await this.professionalService.getOrRefresh(userId) : null;
            if (!professional) {
                throw new ProfessionalNotFoundError();
            }
            res.status(200).json(ApiResponse.success(professional));
        } catch (error) {
            next(error);
        }
    };
}
