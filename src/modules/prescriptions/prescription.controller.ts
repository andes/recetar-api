import { Request, Response, NextFunction } from 'express';
import { PrescriptionService } from './prescription.service';
import { ApiResponse } from '../../shared/api-response';
import {
    CreatePrescriptionDTO, UpdatePrescriptionDTO,
    DispensePrescriptionDTO,
} from './prescription.dto';
import { AndesDispenseDTO, AndesCancelDispenseDTO, AndesSuspendDTO } from '../../integrations/andes';
import { getStringQueryParam } from '../../shared/utils/query';

export class PrescriptionController {
    constructor(private readonly prescriptionService: PrescriptionService) {}

    index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const skip = parseInt(getStringQueryParam(req.query.skip) || '0', 10);
            const limit = parseInt(getStringQueryParam(req.query.limit) || '20', 10);
            const result = await this.prescriptionService.index(skip, limit);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    show = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const prescription = await this.prescriptionService.show(req.params.id);
            res.status(200).json(ApiResponse.success(prescription));
        } catch (error) {
            next(error);
        }
    };

    getByUserId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.params.id;
            const ambito = getStringQueryParam(req.query.ambito);
            const skip = parseInt(getStringQueryParam(req.query.skip) || '0', 10);
            const limit = parseInt(getStringQueryParam(req.query.limit) || '20', 10);
            const result = await this.prescriptionService.getByUserId(userId, ambito, skip, limit);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    findByPatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const dni = req.params.patientId;
            const startDate = getStringQueryParam(req.query.startDate);
            const endDate = getStringQueryParam(req.query.endDate);
            const status = getStringQueryParam(req.query.status);
            const skip = parseInt(getStringQueryParam(req.query.skip) || '0', 10);
            const limit = parseInt(getStringQueryParam(req.query.limit) || '20', 10);
            const result = await this.prescriptionService.findByPatient(dni, startDate, endDate, status, skip, limit);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    getDispensedByCuil = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const cuil = req.params.cuil;
            const skip = parseInt(getStringQueryParam(req.query.skip) || '0', 10);
            const limit = parseInt(getStringQueryParam(req.query.limit) || '20', 10);
            const result = await this.prescriptionService.getDispensedByCuil(cuil, skip, limit);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const prescription = await this.prescriptionService.create(req.body as CreatePrescriptionDTO);
            res.status(201).json(ApiResponse.success(prescription));
        } catch (error) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const prescription = await this.prescriptionService.update(req.params.id, req.body as UpdatePrescriptionDTO);
            res.status(200).json(ApiResponse.success(prescription));
        } catch (error) {
            next(error);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.prescriptionService.delete(req.params.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    dispense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const prescription = await this.prescriptionService.dispense(req.params.id, req.body as DispensePrescriptionDTO);
            res.status(200).json(ApiResponse.success(prescription));
        } catch (error) {
            next(error);
        }
    };

    cancelDispense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = getStringQueryParam(req.query.userId) || '';
            const isAdmin = (req as any).user?.role === 'admin';
            const prescription = await this.prescriptionService.cancelDispense(req.params.id, userId, isAdmin);
            res.status(200).json(ApiResponse.success(prescription));
        } catch (error) {
            next(error);
        }
    };

    getAndesPrescription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.prescriptionService.getAndesPrescription(req.params.id);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    andesDispense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.prescriptionService.andesDispense(req.body as AndesDispenseDTO);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    andesCancelDispense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.prescriptionService.andesCancelDispense(req.body as AndesCancelDispenseDTO);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    andesSuspend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.prescriptionService.andesSuspend(req.body as AndesSuspendDTO);
            res.status(200).json(ApiResponse.success({ message: 'Prescripción suspendida' }));
        } catch (error) {
            next(error);
        }
    };

    verifyAndesReceta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const dni = getStringQueryParam(req.query.dni) || '';
            const conceptId = getStringQueryParam(req.query.conceptId) || '';
            const sexo = getStringQueryParam(req.query.sexo) || '';
            const result = await this.prescriptionService.verifyAndesReceta(dni, conceptId, sexo);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };
}
