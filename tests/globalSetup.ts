import { MongoMemoryServer } from 'mongodb-memory-server';
import { writeFileSync } from 'fs';
import { join } from 'path';

const URI_FILE = join(__dirname, '.db-uri');

export default async function globalSetup() {
    const mongod = await MongoMemoryServer.create();
    writeFileSync(URI_FILE, mongod.getUri(), 'utf-8');
    (global as any).__MONGOD__ = mongod;
}
