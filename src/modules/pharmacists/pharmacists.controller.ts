import { Request, Response, NextFunction } from 'express';
import { PharmacistService } from './pharmacists.service';
import { ApiResponse } from '../../shared/api-response';
import { CreatePharmacistDTO, UpdatePharmacistDTO, CreatePharmacyDTO, UpdatePharmacyDTO } from './pharmacists.dto';

export class PharmacistController {
    constructor(private readonly pharmacistService: PharmacistService) {}

    index = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const pharmacists = await this.pharmacistService.index();
            res.status(200).json(ApiResponse.success(pharmacists));
        } catch (error) {
            next(error);
        }
    };

    show = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const pharmacist = await this.pharmacistService.show(req.params.id);
            res.status(200).json(ApiResponse.success(pharmacist));
        } catch (error) {
            next(error);
        }
    };

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const pharmacist = await this.pharmacistService.create(req.body as CreatePharmacistDTO);
            res.status(201).json(ApiResponse.success(pharmacist));
        } catch (error) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const pharmacist = await this.pharmacistService.update(req.params.id, req.body as UpdatePharmacistDTO);
            res.status(200).json(ApiResponse.success(pharmacist));
        } catch (error) {
            next(error);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.pharmacistService.delete(req.params.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    indexPharmacies = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const pharmacies = await this.pharmacistService.indexPharmacies();
            res.status(200).json(ApiResponse.success(pharmacies));
        } catch (error) {
            next(error);
        }
    };

    showPharmacy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const pharmacy = await this.pharmacistService.showPharmacy(req.params.id);
            res.status(200).json(ApiResponse.success(pharmacy));
        } catch (error) {
            next(error);
        }
    };

    createPharmacy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const pharmacy = await this.pharmacistService.createPharmacy(req.body as CreatePharmacyDTO);
            res.status(201).json(ApiResponse.success(pharmacy));
        } catch (error) {
            next(error);
        }
    };

    updatePharmacy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const pharmacy = await this.pharmacistService.updatePharmacy(req.params.id, req.body as UpdatePharmacyDTO);
            res.status(200).json(ApiResponse.success(pharmacy));
        } catch (error) {
            next(error);
        }
    };

    deletePharmacy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.pharmacistService.deletePharmacy(req.params.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}
