import express from 'express';
import { errorHandler } from '../../src/shared/middlewares/error-handler';
import routes from '../../src/routes/routes';

export function createApp(): express.Application {
    const app = express();
    app.use(express.json());
    app.use('/api', routes);
    app.use(errorHandler);
    return app;
}
