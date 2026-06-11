import { Request, Response, NextFunction } from 'express';
import { SecurityService } from './security.service';
import { ApiResponse } from '../../shared/api-response';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/types';

export class SecurityController {
    constructor(private readonly securityService: SecurityService) {}

    getPinStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as any)._id.toString();
            const status = await this.securityService.getPinStatus(userId);
            res.status(200).json(ApiResponse.success(status));
        } catch (error) {
            next(error);
        }
    };

    setupPin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as any)._id.toString();
            const { currentPassword, pin } = req.body;
            await this.securityService.setupPin(userId, currentPassword, pin);
            res.status(200).json(ApiResponse.success({ message: 'PIN activado exitosamente' }));
        } catch (error) {
            next(error);
        }
    };

    changePin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as any)._id.toString();
            const { currentPin, newPin } = req.body;
            await this.securityService.changePin(userId, currentPin, newPin);
            res.status(200).json(ApiResponse.success({ message: 'PIN actualizado exitosamente' }));
        } catch (error) {
            next(error);
        }
    };

    disablePin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as any)._id.toString();
            const { password } = req.body;
            await this.securityService.disablePin(userId, password);
            res.status(200).json(ApiResponse.success({ message: 'PIN desactivado exitosamente' }));
        } catch (error) {
            next(error);
        }
    };

    getWebAuthnCredentials = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as any)._id.toString();
            const credentials = await this.securityService.getCredentials(userId);
            res.status(200).json(ApiResponse.success(credentials));
        } catch (error) {
            next(error);
        }
    };

    getRegistrationOptions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as any)._id.toString();
            const { name } = req.body;
            const options = await this.securityService.getRegistrationOptions(userId, name);
            res.status(200).json(ApiResponse.success(options));
        } catch (error) {
            next(error);
        }
    };

    verifyRegistration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as any)._id.toString();
            const response = req.body as RegistrationResponseJSON;
            const result = await this.securityService.verifyRegistration(userId, response);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    getAuthenticationOptions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as any)._id.toString();
            const options = await this.securityService.getAuthenticationOptions(userId);
            res.status(200).json(ApiResponse.success(options));
        } catch (error) {
            next(error);
        }
    };

    verifyAuthentication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as any)._id.toString();
            const response = req.body as AuthenticationResponseJSON;
            const result = await this.securityService.verifyAuthentication(userId, response);
            res.status(200).json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    };

    deleteCredential = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as any)._id.toString();
            const { credentialId } = req.params;
            await this.securityService.deleteCredential(userId, credentialId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}
