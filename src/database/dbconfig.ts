import mongoose from 'mongoose';
import { env } from '../config/config';

export const initializeMongo = async (): Promise<void> => {
    let MONGO_URI = process.env.MONGODB_URI || env.MONGODB_CONNECTION;

    // Support Testcontainers for external testing
    if (process.env.NODE_ENV === 'test' || process.env.USE_TESTCONTAINERS === 'true') {
        try {
            const fs = require('fs');
            const path = require('path');
            const envFile = path.join(process.cwd(), '.testcontainers.env');
            if (process.env.TEST_MONGODB_URI) {
                MONGO_URI = process.env.TEST_MONGODB_URI;
            } else if (fs.existsSync(envFile)) {
                const dotenv = require('dotenv');
                const envConfig = dotenv.parse(fs.readFileSync(envFile));
                if (envConfig.TEST_MONGODB_URI) {
                    MONGO_URI = envConfig.TEST_MONGODB_URI;
                }
            }
        } catch (e) {
            // Silently ignore if test utilities are missing
        }
    }

    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true,
            useFindAndModify: false
        });
        // eslint-disable-next-line no-console
        console.log(`DB is connected to: ${MONGO_URI.split('@').pop()}`);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
};

