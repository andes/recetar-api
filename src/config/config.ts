import dotenv from 'dotenv';

dotenv.config();

export const env = {
    API_URI_PREFIX: '/api',
    JWT_SECRET: process.env.JWT_SECRET || 'e18a33b0-9866-4867-800a-d6ffcd8f1cbd',
    TOKEN_LIFETIME: parseInt(process.env.TOKEN_LIFETIME || '1', 10),
    MONGODB_CONNECTION: process.env.MONGODB_URI || 'mongodb://localhost/recetar',
    ANDES_ENDPOINT: process.env.ANDES_ENDPOINT || '',
    JWT_MPI_TOKEN: process.env.JWT_MPI_TOKEN || '',
    ANDES_MPI_ENDPOINT: process.env.ANDES_MPI_ENDPOINT || '',
};
