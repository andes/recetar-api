import dotenv from 'dotenv';

dotenv.config();

export const env = {
    API_URI_PREFIX: '/api',
    JWT_SECRET: process.env.JWT_SECRET || '',
    TOKEN_LIFETIME: parseInt(process.env.TOKEN_LIFETIME || '1', 10),
    MONGODB_CONNECTION: process.env.MONGODB_URI || 'mongodb://localhost/recetar',
    ANDES_ENDPOINT: process.env.ANDES_ENDPOINT || '',
    JWT_MPI_TOKEN: process.env.JWT_MPI_TOKEN || '',
    ANDES_MPI_ENDPOINT: process.env.ANDES_MPI_ENDPOINT || '',
    VADEMECUM_MS_URL: process.env.VADEMECUM_MS_URL || 'http://localhost:4001',
    VADEMECUM_API_KEY: process.env.VADEMECUM_API_KEY || '',
    PATIENT_VALIDATION_ENABLED: process.env.PATIENT_VALIDATION_ENABLED !== 'false',
    SISA_URL: process.env.SISA_URL || '',
    SISA_USERNAME: process.env.SISA_USERNAME || '',
    SISA_PASSWORD: process.env.SISA_PASSWORD || '',
    SISA_PROVINCIA: parseInt(process.env.SISA_PROVINCIA || '15', 10),
};
