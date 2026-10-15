import { Request, Response, NextFunction } from 'express';
import { PrescriptionService } from './prescription.service';
import { SecurityService } from '../security/security.service';
import { ApiResponse } from '../../shared/api-response';
import {
    CreatePrescriptionDTO, UpdatePrescriptionDTO,
    DispensePrescriptionDTO,
} from './prescription.dto';
import { PRESCRIPTION_SEARCH_LIMIT } from './prescription.types';
import { AndesIngestDTO } from './ingest.dto';
import { AndesDispenseDTO, AndesCancelDispenseDTO, AndesSuspendDTO } from '../../integrations/andes';
import { getStringQueryParam } from '../../shared/utils/query';
import { PinRequiredError, InvalidPinError, SecurityTokenInvalidError } from '../security/security.errors';

export class PrescriptionController {
    constructor(
        private readonly prescriptionService: PrescriptionService,
        private readonly securityService: SecurityService
    ) {}

    index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const skip = parseInt(getStringQueryParam(req.query.offset) || getStringQueryParam(req.query.skip) || '0', 10);
            const limit = Math.min(parseInt(getStringQueryParam(req.query.limit) || String(PRESCRIPTION_SEARCH_LIMIT), 10), PRESCRIPTION_SEARCH_LIMIT);
            const status = getStringQueryParam(req.query.status);
            const sexo = getStringQueryParam(req.query.sexo);
            const dateFrom = getStringQueryParam(req.query.dateFrom);
            const dateTo = getStringQueryParam(req.query.dateTo);
            const searchTerm = getStringQueryParam(req.query.searchTerm);
            const filters = { status, sexo, dateFrom, dateTo, searchTerm };
            const result = await this.prescriptionService.index(skip, limit, filters);
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
            const patient = getStringQueryParam(req.query.patient);
            const dateFrom = getStringQueryParam(req.query.dateFrom);
            const dateTo = getStringQueryParam(req.query.dateTo);
            const status = getStringQueryParam(req.query.status);
            const filters = { patient, dateFrom, dateTo, status };
            const result = await this.prescriptionService.getByUserId(userId, ambito, skip, limit, filters);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    findByPatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const dni = req.params.patientId;
            const startDate = getStringQueryParam(req.query.startDate) || getStringQueryParam(req.query.dateFrom);
            const endDate = getStringQueryParam(req.query.endDate) || getStringQueryParam(req.query.dateTo);
            const status = getStringQueryParam(req.query.status);
            const sexo = getStringQueryParam(req.query.sexo);
            const skip = parseInt(getStringQueryParam(req.query.offset) || getStringQueryParam(req.query.skip) || '0', 10);
            const limit = Math.min(parseInt(getStringQueryParam(req.query.limit) || String(PRESCRIPTION_SEARCH_LIMIT), 10), PRESCRIPTION_SEARCH_LIMIT);
            const result = await this.prescriptionService.findByPatient(dni, startDate, endDate, status, sexo, skip, limit);
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
            const userId = (req.user as any)._id.toString();
            const securityPin = req.headers['x-security-pin'] as string | undefined;
            const securityToken = req.headers['x-security-token'] as string | undefined;

            const hasPin = await this.securityService.hasPinActive(userId);
            const hasBiometric = await this.securityService.hasWebAuthnCredentials(userId);

            if (hasPin || hasBiometric) {
                if (securityPin) {
                    const isValid = await this.securityService.verifyPin(userId, securityPin);
                    if (!isValid) {
                        throw new InvalidPinError();
                    }
                } else if (securityToken) {
                    const isValid = await this.securityService.verifySecurityToken(userId, securityToken);
                    if (!isValid) {
                        throw new SecurityTokenInvalidError();
                    }
                } else {
                    throw new PinRequiredError();
                }
            }

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
            const isAdmin = ((req.user as any)?.roleNames || []).includes('admin');
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

    ingest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.prescriptionService.ingest(req.body as AndesIngestDTO);
            res.status(201).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    recetasPorPrestacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.prescriptionService.getRecetasPorPrestacion(req.params.id);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    recetasPorPaciente = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const ambito = getStringQueryParam(req.query.ambito);
            const result = await this.prescriptionService.getRecetasPorPaciente(req.params.dni, ambito);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    recetasPorProfesional = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.prescriptionService.getRecetasPorProfesional(req.params.id);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    recetasCompatibles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const filtros = {
                documento: getStringQueryParam(req.query.documento),
                estado: getStringQueryParam(req.query.estado),
                fechaInicio: getStringQueryParam(req.query.fechaInicio),
                fechaFin: getStringQueryParam(req.query.fechaFin),
            };
            const result = await this.prescriptionService.getRecetasCompatibles(filtros);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    recetasMotivos = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = this.prescriptionService.getMotivos();
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    recetasVerificar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const dni = getStringQueryParam(req.query.dni) || '';
            const conceptId = getStringQueryParam(req.query.conceptId) || '';
            const sexo = getStringQueryParam(req.query.sexo) || '';
            const result = await this.prescriptionService.getVerificar(dni, conceptId, sexo);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    recetasPatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const op = req.body?.op;
            const result = await this.prescriptionService.patchReceta(op, req.body);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    recetasDispensa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.prescriptionService.recordDispensa(req.params.id, {
                tipo: req.body?.tipo,
                sistema: req.body?.sistema,
                cantidad: req.body?.cantidad,
                descripcion: req.body?.descripcion,
            });
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };
}
