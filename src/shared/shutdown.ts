import type { Server } from 'http';

const DEFAULT_TIMEOUT_MS = 3000;

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GracefulShutdownOptions {
    server?: Server | null;
    shutdown?: () => Promise<void>;
    timeoutMs?: number;
}

/**
 * Cierra el servidor HTTP y hace flush de la telemetría sin colgarse si
 * alguna de las dos cosas no responde. No llama a process.exit: eso queda
 * a cargo del entrypoint.
 */
export async function gracefulShutdown(options: GracefulShutdownOptions = {}): Promise<void> {
    const { server, shutdown, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

    if (server) {
        const closed = new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
        server.closeIdleConnections?.();
        await Promise.race([closed, delay(timeoutMs)]);
        server.closeAllConnections?.();
    }

    if (shutdown) {
        await Promise.race([shutdown().catch(() => undefined), delay(timeoutMs)]);
    }
}
