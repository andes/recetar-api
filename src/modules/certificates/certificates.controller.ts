import { Request, Response, NextFunction } from 'express';
import { CertificateService } from './certificates.service';
import { ApiResponse } from '../../shared/api-response';
import { CreateCertificateDTO, UpdateCertificateDTO } from './certificates.dto';
import { ICertificate } from './certificates.types';
import { getStringQueryParam } from '../../shared/utils/query';

export class CertificateController {
    constructor(private readonly certificateService: CertificateService) {}

    index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const skip = parseInt(getStringQueryParam(req.query.skip) || '0', 10);
            const limit = parseInt(getStringQueryParam(req.query.limit) || '20', 10);
            const userId = getStringQueryParam(req.query.userId);
            const searchTerm = getStringQueryParam(req.query.searchTerm);

            let result: { certificates: ICertificate[]; total: number };
            if (userId && searchTerm) {
                result = await this.certificateService.searchByUserId(userId, searchTerm, skip, limit);
            } else if (userId) {
                result = await this.certificateService.getByUserId(userId, skip, limit);
            } else {
                result = await this.certificateService.index(skip, limit);
            }

            res.status(200).json(ApiResponse.success({ certificates: result.certificates, total: result.total, offset: skip, limit }));
        } catch (error) {
            next(error);
        }
    };

    show = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const certificate = await this.certificateService.show(req.params.id);
            res.status(200).json(ApiResponse.success(certificate));
        } catch (error) {
            next(error);
        }
    };

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const certificate = await this.certificateService.create(req.body as CreateCertificateDTO);
            res.status(201).json(ApiResponse.success(certificate));
        } catch (error) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const certificate = await this.certificateService.update(req.params.id, req.body as UpdateCertificateDTO);
            res.status(200).json(ApiResponse.success(certificate));
        } catch (error) {
            next(error);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.certificateService.delete(req.params.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}
