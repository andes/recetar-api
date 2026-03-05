import dotenv from 'dotenv';

dotenv.config();

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
