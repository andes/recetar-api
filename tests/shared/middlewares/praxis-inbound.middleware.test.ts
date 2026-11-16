import express from 'express';
import request from 'supertest';
import {
    createPraxisInboundGuard,
    PraxisInboundGuardConfig,
} from '../../../src/shared/middlewares/praxis-inbound.middleware';
import { errorHandler } from '../../../src/shared/middlewares/error-handler';

function buildApp(overrides: Partial<PraxisInboundGuardConfig> = {}, trustProxy = false) {
    const config: PraxisInboundGuardConfig = {
        enabled: true,
        allowedIps: [],
        enforceHttps: false,
        isProduction: false,
        ...overrides,
    };
    const app = express();
    if (trustProxy) {
        app.set('trust proxy', true);
    }
    app.use(createPraxisInboundGuard(config));
    app.get('/test', (_req, res) => res.status(200).json({ ok: true }));
    app.use(errorHandler);
    return app;
}

describe('praxisInboundGuard', () => {
    it('permite el acceso en desarrollo sin allowlist', async () => {
        const response = await request(buildApp()).get('/test');
        expect(response.status).toBe(200);
    });

    it('rechaza en producción si la allowlist está vacía', async () => {
        const response = await request(buildApp({ isProduction: true })).get('/test');
        expect(response.status).toBe(403);
    });

    it('permite una IP de la allowlist', async () => {
        const response = await request(buildApp({ allowedIps: ['127.0.0.1'] })).get('/test');
        expect(response.status).toBe(200);
    });

    it('permite un rango CIDR', async () => {
        const response = await request(buildApp({ allowedIps: ['127.0.0.0/8'] })).get('/test');
        expect(response.status).toBe(200);
    });

    it('rechaza una IP fuera de la allowlist', async () => {
        const response = await request(buildApp({ allowedIps: ['10.0.0.0/8'] })).get('/test');
        expect(response.status).toBe(403);
    });

    it('exige x-api-key cuando está configurada', async () => {
        const app = buildApp({ apiKey: 'secret' });

        const denied = await request(app).get('/test');
        const allowed = await request(app).get('/test').set('x-api-key', 'secret');

        expect(denied.status).toBe(403);
        expect(allowed.status).toBe(200);
    });

    it('exige HTTPS cuando está configurado', async () => {
        const app = buildApp({ enforceHttps: true }, true);

        const denied = await request(app).get('/test');
        const allowed = await request(app).get('/test').set('x-forwarded-proto', 'https');

        expect(denied.status).toBe(403);
        expect(allowed.status).toBe(200);
    });

    it('ignora x-forwarded-for si trust proxy está deshabilitado', async () => {
        const response = await request(buildApp({ allowedIps: ['10.0.0.0/8'] }))
            .get('/test')
            .set('x-forwarded-for', '10.1.1.1');

        expect(response.status).toBe(403);
    });

    it('devuelve 404 cuando la superficie está deshabilitada', async () => {
        const response = await request(buildApp({ enabled: false })).get('/test');
        expect(response.status).toBe(404);
    });
});
