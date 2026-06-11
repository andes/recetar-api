import { Request, Response, NextFunction } from 'express';
import { PatientService } from './patients.service';
import { ApiResponse } from '../../shared/api-response';
import { CreatePatientDTO, UpdatePatientDTO } from './patients.dto';
import { getStringQueryParam } from '../../shared/utils/query';

export class PatientController {
    constructor(private readonly patientService: PatientService) {}

    list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const patients = await this.patientService.list();
            res.status(200).json(ApiResponse.success(patients));
        } catch (error) {
            next(error);
        }
    };

    show = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const patient = await this.patientService.show(req.params.id);
            res.status(200).json(ApiResponse.success(patient));
        } catch (error) {
            next(error);
        }
    };

    search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const q = getStringQueryParam(req.query.q) || '';
            const patients = await this.patientService.search(q);
            res.status(200).json(ApiResponse.success(patients));
        } catch (error) {
            next(error);
        }
    };

    findByDni = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const patients = await this.patientService.findByDni(req.params.dni);
            res.status(200).json(ApiResponse.success(patients));
        } catch (error) {
            next(error);
        }
    };

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const patient = await this.patientService.create(req.body as CreatePatientDTO);
            res.status(201).json(ApiResponse.success(patient));
        } catch (error) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const patient = await this.patientService.update(req.params.id, req.body as UpdatePatientDTO);
            res.status(200).json(ApiResponse.success(patient));
        } catch (error) {
            next(error);
        }
    };

    updatePartial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const patient = await this.patientService.updatePartial(req.params.id, req.body);
            res.status(200).json(ApiResponse.success(patient));
        } catch (error) {
            next(error);
        }
    };

    getCoverages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const q = getStringQueryParam(req.query.q) || '';
            const coverages = q
                ? await this.patientService.searchCoverages(q)
                : await this.patientService.getCoverages();
            res.status(200).json(ApiResponse.success(coverages));
        } catch (error) {
            next(error);
        }
    };

    getCoverage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const dni = getStringQueryParam(req.params.dni) || '';
            const sexo = getStringQueryParam(req.query.sexo) || '';
            const coverage = await this.patientService.getCoverage(dni, sexo);
            res.status(200).json(ApiResponse.success(coverage));
        } catch (error) {
            next(error);
        }
    };

    validateIdentity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { dni, sexo } = req.body;
            if (!dni || !sexo) {
                res.status(400).json(ApiResponse.error('VALIDATION_ERROR', 'dni and sexo are required'));
                return;
            }
            const result = await this.patientService.validateIdentity(dni, sexo);
            if (result) {
                res.status(200).json(ApiResponse.success(result));
            } else {
                res.status(404).json(ApiResponse.error('VALIDATION_NOT_FOUND', 'Persona no encontrada'));
            }
        } catch (error) {
            next(error);
        }
    };
}
