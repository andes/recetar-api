import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { join } from 'path';

const URI_FILE = join(__dirname, '../.db-uri');

export async function connectTestDB(): Promise<void> {
    if (mongoose.connection.readyState !== 0) return;
    const uri = readFileSync(URI_FILE, 'utf-8');
    await mongoose.connect(uri);
}

export async function disconnectTestDB(): Promise<void> {
    await mongoose.disconnect();
}

export async function clearCollections(): Promise<void> {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
        await collections[key].deleteMany({});
    }
}
