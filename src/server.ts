import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { errorHandler } from './middlewares/error.middleware';
import { notFoundHandler } from './middlewares/notFound.middleware';
import * as db from './database/dbconfig';
// config
import { env } from './config/config';
// services

import routes from './routes/routes';

class Server {

    protected app: express.Application;
    private isConfigured = false;

    constructor() {
        this.app = express();
    }

    private getApiPrefix(): string {
        return process.env.API_URI_PREFIX || process.env.API_URI_PRFIX || env.API_URI_PREFIX;
    }

    async config() {
        if (this.isConfigured) {
            return;
        }

        await db.initializeMongo();
        this.app.set('port', process.env.PORT || 4000);
        // logger
        this.app.use(morgan('dev'));
        // security
        this.app.use(helmet());
        // request compression
        this.app.use(compression());
        this.app.use(cors());
        // middleware
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: false }));
        // routes
        this.routes();
        this.app.use(errorHandler);
        this.app.use(notFoundHandler);
        this.isConfigured = true;
    }

    routes() {
        this.app.use(this.getApiPrefix(), routes);
    }

    async start() {
        await this.config();
        this.app.listen(this.app.get('port'), () => {
            // eslint-disable-next-line no-console
            console.log(`🚀 API Server running on port ${this.app.get('port')}`);
            // eslint-disable-next-line no-console
            console.log(`📋 API disponible en: http://localhost:${this.app.get('port')}${this.getApiPrefix()}`);
        });
    }

    async gracefulShutdown() {
        // eslint-disable-next-line no-console
        console.log('Cerrando servidor API...');
        process.exit(0);
    }
}

const server = new Server();

// Manejo de cierre graceful
process.on('SIGTERM', () => server.gracefulShutdown());
process.on('SIGINT', () => server.gracefulShutdown());

server.start().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
});
