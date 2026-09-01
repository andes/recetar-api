import dotenv from 'dotenv';

dotenv.config();

export const env = {
    API_URI_PREFIX: '/api',
    EVWEB_ENDPOINT: process.env.EVWEB_ENDPOINT || '',
    EVWEB_USERNAME: process.env.EVWEB_USERNAME || '',
    EVWEB_PASSWORD: process.env.EVWEB_PASSWORD || '',
    EVWEB_PROVINCIA: process.env.EVWEB_PROVINCIA || 'Neuquén',
};

export const httpCodes = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    EXPIRED_TOKEN: 406,
    EXPECTATION_FAILED: 417,
    BAD_REQUEST: 400,
    CREATED: 201,
    INTERNAL_SERVER_ERROR: 500,
    OK: 200,
    NOT_FOUND: 404,
};
