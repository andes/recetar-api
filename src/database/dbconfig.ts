import mongoose from 'mongoose';
import { env } from '../config/config';
import { isDev } from '../shared/logger/dev-logger';

export const initializeMongo = async (): Promise<void> => {
    const MONGO_URI = process.env.MONGODB_URI || env.MONGODB_CONNECTION;
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
        } as any);
        if (isDev()) {
            // eslint-disable-next-line no-console
            console.log('DB is connected');
        }
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
};
