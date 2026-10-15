import { Request, Response, NextFunction } from 'express';
import { ApplicationService } from './applications.service';
import { ApiResponse } from '../../shared/api-response';
import { CreateApplicationDTO, IssueApplicationTokenDTO } from './applications.dto';
import { AppPrincipal } from '../../shared/middlewares/app-auth.middleware';

export class ApplicationController {
    constructor(private readonly applicationService: ApplicationService) {}

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const application = await this.applicationService.create(req.body as CreateApplicationDTO);
            res.status(201).json(ApiResponse.success(application));
        } catch (error) {
            next(error);
        }
    };

    issueToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.applicationService.issueToken(
                req.params.id,
                req.body as IssueApplicationTokenDTO,
            );
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const principal = (req as unknown as { user: AppPrincipal }).user;
            res.status(200).json(ApiResponse.success(principal));
        } catch (error) {
            next(error);
        }
    };
}
