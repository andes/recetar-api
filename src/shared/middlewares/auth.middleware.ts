import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../../models/user.model';
import { AuthError } from '../errors';
import { extractRoleNames } from './auth.types';

export const checkAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AuthError('errors.auth.default'));
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || '';

    let payload: any;
    try {
        payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    } catch {
        return next(new AuthError('errors.auth.invalidToken'));
    }

    const user = await User.findById(payload.sub)
        .populate({ path: 'roles', select: 'role' })
        .exec();
    if (!user) {
        return next(new AuthError('errors.auth.default'));
    }

    (user as any).roleNames = extractRoleNames(user.roles as unknown as Array<{ role?: string }>);

    req.user = user;
    next();
};
