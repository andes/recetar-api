import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';
import { ValidationError } from '../errors';
import { t } from '../lang';

type ValidationTarget = 'body' | 'query' | 'params';

export const validate = (schema: ZodType, target: ValidationTarget = 'body') => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req[target]);
        if (!result.success) {
            const details = result.error.issues.map(e => ({
                field: e.path.join('.'),
                message: t(e.message, e.message),
            }));
            throw new ValidationError('errors.validation.default', details);
        }
        req[target] = result.data;
        next();
    };
};
