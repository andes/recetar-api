import { Logger } from './logger.interface';

export function isDev(): boolean {
    return process.env.NODE_ENV === 'development';
}

// Logger compartido: info/warn solo en desarrollo; los errores siempre se imprimen.
export const devLogger: Logger = {
    logInfo: (message: string, data?: Record<string, unknown>) => {
        if (!isDev()) { return; }
        // eslint-disable-next-line no-console
        console.log(message, data ?? {});
    },
    logWarn: (message: string, data?: Record<string, unknown>) => {
        if (!isDev()) { return; }
        // eslint-disable-next-line no-console
        console.warn(message, data ?? {});
    },
    logError: (error: Error, context?: Record<string, unknown>) => {
        // eslint-disable-next-line no-console
        console.error(error?.message ?? error, context ?? {});
    },
};
