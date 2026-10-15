import { Request, Response, NextFunction } from 'express';
import accessControl from '../security/access-control';
import { ForbiddenError } from '../errors';
import { PrincipalUser } from './auth.types';

const ACTION_METHOD: Record<string, string> = {
    'create:any': 'createAny',
    'create:own': 'createOwn',
    'read:any': 'readAny',
    'read:own': 'readOwn',
    'update:any': 'updateAny',
    'update:own': 'updateOwn',
    'delete:any': 'deleteAny',
    'delete:own': 'deleteOwn',
};

export const hasPermission = (roles: string[], action: string, resource: string): boolean => {
    const method = ACTION_METHOD[action];
    if (!method || roles.length === 0) {
        return false;
    }
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const permission = (accessControl.can(roles) as any)[method](resource);
        return !!permission?.granted;
    } catch {
        return false;
    }
};

export const requirePermission = (action: string, resource: string) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const roles = (req.user as unknown as PrincipalUser)?.roleNames || [];
        if (!hasPermission(roles, action, resource)) {
            return next(new ForbiddenError('errors.forbidden.noPermission'));
        }
        next();
    };
};
