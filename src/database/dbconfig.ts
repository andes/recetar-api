import mongoose from 'mongoose';

export const initializeMongo = async (): Promise<void> => {
    const MONGO_URI = `${(process.env.MONGODB_URI)}`;
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true,
            useFindAndModify: false
        });
        // eslint-disable-next-line no-console
        console.log('DB is connected');
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
};
