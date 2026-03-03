import mongoose from 'mongoose';

let mongoContainer: any;
let isExternalContainer = false;

beforeAll(async () => {
    let uri = process.env.TEST_MONGODB_URI;

    // Try to load from .testcontainers.env if it exists
    const fs = require('fs');
    const path = require('path');
    const envFile = path.join(process.cwd(), '.testcontainers.env');

    if (!uri && fs.existsSync(envFile)) {
        try {
            const dotenv = require('dotenv');
            const envConfig = dotenv.parse(fs.readFileSync(envFile));
            uri = envConfig.TEST_MONGODB_URI;
        } catch (e) {
            console.warn('Could not parse .testcontainers.env:', (e as any).message);
        }
    }

    if (uri) {
        console.log(`Using existing MongoDB container at ${uri}`);
        isExternalContainer = true;
    } else {
        console.log('Starting new MongoDB container for this test run...');
        const { GenericContainer } = require('testcontainers');
        mongoContainer = await new GenericContainer('mongo:4.4')
            .withExposedPorts(27017)
            .start();

        const host = mongoContainer.getHost();
        const port = mongoContainer.getMappedPort(27017);
        uri = `mongodb://${host}:${port}/test_database`;
    }

    await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
    });
});

afterAll(async () => {
    // Drop the database before disconnecting
    if (mongoose.connection && mongoose.connection.db) {
        await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();

    if (mongoContainer && !isExternalContainer) {
        await mongoContainer.stop();
    }
});

