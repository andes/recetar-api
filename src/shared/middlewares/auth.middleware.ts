import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../../models/user.model';
import { AuthError } from '../errors';

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

    const user = await User.findById(payload.sub).select('_id').exec();
    if (!user) {
        return next(new AuthError('errors.auth.default'));
    }

    req.user = user;
    next();
};
