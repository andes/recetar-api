import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { errorHandler } from '../../src/middlewares/error.middleware';
import { notFoundHandler } from '../../src/middlewares/notFound.middleware';
import routes from '../../src/routes/routes';
import { env } from '../../src/config/config';

export const createApp = (): express.Application => {
    const app = express();

    // logger
    app.use(morgan('dev'));
    // security
    app.use(helmet());
    // request compression
    app.use(compression());
    app.use(cors());
    // middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // routes
    app.use(`${(process.env.API_URI_PRFIX || env.API_URI_PREFIX)}`, routes);

    // error handlers
    app.use(errorHandler);
    app.use(notFoundHandler);

    return app;
};
