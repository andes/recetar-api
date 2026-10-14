import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Application from '../../modules/applications/applications.model';
import { AuthError, ForbiddenError } from '../errors';
import { IApplicationOrganization } from '../../modules/applications/applications.types';

export interface AppPrincipal {
    type: 'app-token';
    app: { id: string; nombre: string };
    organizacion?: IApplicationOrganization;
    permisos: string[];
}

export const checkAppAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AuthError('errors.auth.default'));
    }

    const token = authHeader.split(' ')[1];

    let payload: any;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET || '', { algorithms: ['HS256'] });
    } catch {
        return next(new AuthError('errors.auth.invalidToken'));
    }

    if (!payload?.isAppToken || !payload?.app?.id) {
        return next(new AuthError('errors.auth.invalidToken'));
    }

    const application = await Application.findById(payload.app.id).exec();
    if (!application || !application.activo) {
        return next(new AuthError('errors.auth.default'));
    }

    if (application.token !== token) {
        return next(new AuthError('errors.auth.invalidToken'));
    }

    const principal: AppPrincipal = {
        type: 'app-token',
        app: { id: application._id.toString(), nombre: application.nombre },
        ...(application.organizacion ? { organizacion: application.organizacion } : {}),
        permisos: application.permisos,
    };
    (req as unknown as { user: AppPrincipal }).user = principal;
    next();
};

export const requireAppPermission = (permission: string) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const principal = (req as unknown as { user?: AppPrincipal }).user;
        const permisos = principal?.permisos || [];
        const resource = permission.split(':')[0];
        if (permisos.includes(permission) || permisos.includes(`${resource}:*`)) {
            return next();
        }
        next(new ForbiddenError('errors.forbidden.noPermission'));
    };
};
