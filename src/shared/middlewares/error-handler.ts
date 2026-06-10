import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../errors';
import { ApiResponse } from '../api-response';
import { t } from '../lang';

export const errorHandler = (
    error: Error,
    _request: Request,
    response: Response,
    _next: NextFunction
): void => {
    if (error instanceof ApiError) {
        const message = error.messageKey
            ? t(error.messageKey, error.message)
            : error.message;

        response.status(error.statusCode).json(
            ApiResponse.error(error.code, message, error.details)
        );
        return;
    }

    const fallbackMessage = process.env.NODE_ENV === 'production'
        ? t('errors.internal.default')
        : error.message || t('errors.internal.default');

    response.status(500).json(
        ApiResponse.error('INTERNAL_ERROR', fallbackMessage)
    );
};
