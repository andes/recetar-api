import { Request, Response, NextFunction } from 'express';
import * as JWT from 'jsonwebtoken';
import { httpCodes } from '../config/config';

/**
 * Middleware de seguridad para consumo máquina-a-máquina (API / app-token).
 *
 * Verifica que el request traiga un Bearer token firmado por Recetar con el
 * flag `isAppToken: true` (el emitido por `POST /admin/generate-app-token`).
 * De esta forma se rechazan los JWT de usuario comunes aunque tengan permisos.
 *
 * Se asume que el `checkAuth` global (passport jwt) ya validó la existencia y
 * estado del usuario asociado al token.
 *
 * Documentación: docs/api/prescriptions-by-patient-idmpi.md
 */
export const requireAppToken = (req: Request, res: Response, next: NextFunction): void | Response => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(httpCodes.UNAUTHORIZED).json({ message: 'Token de API requerido' });
    }

    const token = header.slice('Bearer '.length).trim();

    try {
        const payload = JWT.verify(token, (process.env.JWT_SECRET || ''), { algorithms: ['HS256'] }) as { isAppToken?: boolean };

        if (payload?.isAppToken !== true) {
            return res.status(httpCodes.FORBIDDEN).json({ message: 'Se requiere un token de API válido' });
        }
    } catch (err) {
        return res.status(httpCodes.UNAUTHORIZED).json({ message: 'Token de API inválido o expirado' });
    }

    next();
};
