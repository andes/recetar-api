import express from 'express';
import { apiReference } from '@scalar/express-api-reference';
import cors from 'cors';
import * as http from 'http';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { errorHandler } from './shared/middlewares/error-handler';
import { env } from './config/config';
import { buildOpenApiSpec } from './config/openapi';
import { initializeMongo } from './database/dbconfig';
import routes from './routes/routes';

const SERVICE_NAME = 'recetar-api';
const INSTANCE_ID = process.env.INSTANCE_ID || '1';
const PORT = parseInt(process.env.PORT || '4000', 10);

const logger = pino({
    name: SERVICE_NAME,
    level: process.env.LOG_LEVEL || 'info',
    base: {
        service: SERVICE_NAME,
        instance: INSTANCE_ID,
        host: process.env.HOSTNAME || 'unknown'
    },
    formatters: {
        level: (label) => ({ level: label })
    }
});

const apiSpec = buildOpenApiSpec();

class Server {
    protected app: express.Application;

    constructor() {
        this.app = express();
    }

    private getApiPrefix(): string {
        return process.env.API_URI_PREFIX || process.env.API_URI_PRFIX || env.API_URI_PREFIX;
    }

    async config() {
        logger.info({ action: 'initializing_db' }, 'Connecting to MongoDB');
        await initializeMongo();
        this.app.set('port', PORT);

        this.app.use(pinoHttp({ logger }));
        this.app.use(express.json());
        this.app.use(cors());

        this.app.use('/api-docs', apiReference({
            spec: { content: apiSpec },
            metaData: { title: 'RecetAR API - Documentación' },
        }));
        this.app.use(this.getApiPrefix(), routes);

        this.app.use(errorHandler);
        this.app.use((_req, res) => {
            res.status(404).json({ status: 'error', error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
        });
    }

    async start() {
        await this.config();
        const port = this.app.get('port');
        const prefix = this.getApiPrefix();
        this.app.listen(port, () => {
            logger.info({ action: 'startup', port }, `Server running on port ${port}`);
            logger.info({ action: 'startup', url: `http://localhost:${port}${prefix}` }, `API: http://localhost:${port}${prefix}`);
            logger.info({ action: 'startup', url: `http://localhost:${port}/api-docs` }, `Docs: http://localhost:${port}/api-docs`);
        });
    }

    async gracefulShutdown() {
        logger.info({ action: 'shutdown' }, 'Shutting down API server');
        process.exit(0);
    }
}

const server = new Server();

process.on('SIGTERM', () => server.gracefulShutdown());
process.on('SIGINT', () => server.gracefulShutdown());

server.start().catch((error) => {
    logger.error({ err: error.stack || error.message, action: 'startup_error' }, 'Failed to start server');
});

if (process.env.TRAFFIC_GENERATOR === 'true') {
    const apiPrefix = process.env.API_URI_PREFIX || process.env.API_URI_PRFIX || env.API_URI_PREFIX;
    const endpoints = [
        `${apiPrefix}/health`,
        `${apiPrefix}/health`,
        `${apiPrefix}/recetas`,
        `${apiPrefix}/recetas/estadisticas`,
    ];

    function simulateTraffic() {
        const path = endpoints[Math.floor(Math.random() * endpoints.length)];
        const req = http.request({ hostname: 'localhost', port: PORT, path, method: 'GET' }, (res) => {
            res.resume();
            res.on('end', () => {
                logger.debug({ action: 'simulated_traffic', path, status: res.statusCode });
            });
        });
        req.on('error', () => {});
        req.end();
    }

    setInterval(() => {
        simulateTraffic();
    }, 8000 + Math.random() * 7000);

    logger.info({ action: 'traffic_generator_started' }, 'Simulated traffic generator started');
}
