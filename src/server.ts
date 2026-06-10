import express from 'express';
import { apiReference } from '@scalar/express-api-reference';
import cors from 'cors';
import { errorHandler } from './shared/middlewares/error-handler';
import { env } from './config/config';
import { buildOpenApiSpec } from './config/openapi';
import { initializeMongo } from './database/dbconfig';
import routes from './routes/routes';

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
        await initializeMongo();
        this.app.set('port', process.env.PORT || 4000);

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
        this.app.listen(this.app.get('port'), () => {
            // eslint-disable-next-line no-console
            console.log(`API Server running on port ${this.app.get('port')}`);
            // eslint-disable-next-line no-console
            console.log(`API disponible en: http://localhost:${this.app.get('port')}${this.getApiPrefix()}`);
            // eslint-disable-next-line no-console
            console.log(`Documentación API: http://localhost:${this.app.get('port')}/api-docs`);
        });
    }

    async gracefulShutdown() {
        // eslint-disable-next-line no-console
        console.log('Cerrando servidor API...');
        process.exit(0);
    }
}

const server = new Server();

process.on('SIGTERM', () => server.gracefulShutdown());
process.on('SIGINT', () => server.gracefulShutdown());

server.start().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
});
