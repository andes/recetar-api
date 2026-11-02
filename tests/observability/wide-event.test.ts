import express from 'express';
import request from 'supertest';
import { createLogger, httpMiddleware, wideEventMiddleware } from '@andes/log';
import type { Logger } from '@andes/log';

interface CapturedEvent {
    level: 'info' | 'warn' | 'error';
    data?: Record<string, unknown>;
}

function captureLogger(events: CapturedEvent[]): Logger {
    return {
        logInfo: (_message: string, data?: Record<string, unknown>) => events.push({ level: 'info', data }),
        logWarn: (_message: string, data?: Record<string, unknown>) => events.push({ level: 'warn', data }),
        logError: (error: Error, data?: Record<string, unknown>) => events.push({ level: 'error', data }),
    };
}

function buildApp(events: CapturedEvent[]) {
    const app = express();
    app.use(httpMiddleware({ autoLogging: false }));
    app.use(wideEventMiddleware(captureLogger(events)));
    app.get('/ok', (_req, res) => res.json({ ok: true }));
    app.get('/boom', () => {
        throw new Error('boom');
    });
    app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
        res.status(500).json({ message: error.message })
    );
    return app;
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('wide events HTTP', () => {
    it('respeta y devuelve X-Request-Id', async () => {
        const events: CapturedEvent[] = [];
        const response = await request(buildApp(events)).get('/ok').set('X-Request-Id', 'req-123');
        await flush();

        expect(response.status).toBe(200);
        expect(response.headers['x-request-id']).toBe('req-123');
    });

    it('no emite wide event de un 200 cuando LOG_SAMPLE_RATE es 0', async () => {
        const events: CapturedEvent[] = [];
        await request(buildApp(events)).get('/ok');
        await flush();

        expect(events).toHaveLength(0);
    });

    it('emite wide event de error con los campos del contrato', async () => {
        const events: CapturedEvent[] = [];
        const response = await request(buildApp(events)).get('/boom').set('X-Request-Id', 'req-500');
        await flush();

        expect(response.status).toBe(500);
        expect(response.headers['x-request-id']).toBe('req-500');
        expect(events).toHaveLength(1);
        expect(events[0].level).toBe('error');
        expect(events[0].data).toMatchObject({
            action: 'http.request',
            request_id: 'req-500',
            method: 'GET',
            path: '/boom',
            status_code: 500,
            outcome: 'error',
        });
        expect(events[0].data?.duration_ms).toEqual(expect.any(Number));
    });

    it('usa el logger de módulo para los wide events', () => {
        const logger = createLogger('wide-event');
        expect(logger).toHaveProperty('logInfo');
        expect(logger).toHaveProperty('logWarn');
        expect(logger).toHaveProperty('logError');
    });
});
