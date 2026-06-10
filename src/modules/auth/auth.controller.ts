import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../shared/api-response';
import {
    LoginDTO,
    RegisterDTO,
    RefreshDTO,
    ResetPasswordDTO,
    RecoverPasswordDTO,
    SetValidationTokenDTO,
    GetTokenDTO,
    GetProfessionalsAndesDTO,
} from './auth.dto';
import { getStringQueryParam } from '../../shared/utils/query';

export class AuthController {
    constructor(private readonly authService: AuthService) {}

    login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.authService.login(req.body as LoginDTO);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    loginJwt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.authService.loginWithJwt((req.user as any)._id.toString());
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = await this.authService.register(req.body as RegisterDTO);
            res.status(200).json(ApiResponse.success(user));
        } catch (error) {
            next(error);
        }
    };

    logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { refreshToken } = req.body as RefreshDTO;
            await this.authService.logout(refreshToken);
            res.status(204).json(ApiResponse.success(null));
        } catch (error) {
            next(error);
        }
    };

    refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.authService.refresh(req.body as RefreshDTO);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as any)._id.toString();
            await this.authService.resetPassword(userId, req.body as ResetPasswordDTO);
            res.status(200).json(ApiResponse.success({ message: 'Se ha modificado la contraseña correctamente' }));
        } catch (error) {
            next(error);
        }
    };

    recoverPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.authService.recoverPassword(req.body as RecoverPasswordDTO);
            res.status(200).json(ApiResponse.success({ message: 'Se ha modificado la contraseña correctamente' }));
        } catch (error) {
            next(error);
        }
    };

    setValidationTokenAndNotify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.authService.setValidationTokenAndNotify(req.body as SetValidationTokenDTO);
            res.status(200).json(ApiResponse.success({ message: 'Se ha enviado un correo a su casilla' }));
        } catch (error) {
            next(error);
        }
    };

    getToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.authService.getToken(req.body as GetTokenDTO);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    getPharmacyAndes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const cuil = req.query.cuil as string;
            const disposicionHabilitacion = req.query.disposicionHabilitacion as string;
            const result = await this.authService.getPharmacyAndes(cuil, disposicionHabilitacion);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    getProfessionalsAndes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const dto: GetProfessionalsAndesDTO = {
                documento: getStringQueryParam(req.query.documento) || '',
                matricula: getStringQueryParam(req.query.matricula),
                cuil: getStringQueryParam(req.query.cuil),
                fechaEgreso: getStringQueryParam(req.query.fechaEgreso),
                fechaMatVencimiento: getStringQueryParam(req.query.fechaMatVencimiento),
                profesionCodigo: getStringQueryParam(req.query.profesionCodigo),
            };
            const result = await this.authService.getProfessionalsAndes(dto);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    getAuthorizedProfessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.authService.getAuthorizedProfessions();
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    getRoleTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.authService.getRoleTypes();
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };
}
