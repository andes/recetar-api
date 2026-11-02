import type { Server } from 'http';
import { gracefulShutdown } from '../../src/shared/shutdown';

function fakeServer(events: string[], close: (cb: () => void) => void = (cb) => cb()): Server {
    return {
        close: (cb: () => void) => {
            events.push('close');
            close(cb);
        },
        closeIdleConnections: () => events.push('close-idle'),
        closeAllConnections: () => events.push('close-all'),
    } as unknown as Server;
}

describe('gracefulShutdown', () => {
    it('cierra el servidor antes de hacer flush de telemetría', async () => {
        const events: string[] = [];

        await gracefulShutdown({
            server: fakeServer(events),
            shutdown: async () => {
                events.push('shutdown');
            },
            timeoutMs: 50,
        });

        expect(events).toEqual(['close', 'close-idle', 'close-all', 'shutdown']);
    });

    it('no se cuelga si el servidor no termina de cerrar', async () => {
        const events: string[] = [];
        const start = Date.now();

        await gracefulShutdown({
            server: fakeServer(events, () => undefined),
            timeoutMs: 20,
        });

        expect(Date.now() - start).toBeLessThan(500);
    });

    it('tolera que el flush falle', async () => {
        await expect(
            gracefulShutdown({
                shutdown: async () => {
                    throw new Error('collector inalcanzable');
                },
                timeoutMs: 20,
            })
        ).resolves.toBeUndefined();
    });

    it('respeta el timeout cuando el flush no responde', async () => {
        const start = Date.now();

        await gracefulShutdown({
            shutdown: () => new Promise<void>(() => undefined),
            timeoutMs: 20,
        });

        expect(Date.now() - start).toBeLessThan(500);
    });
});
