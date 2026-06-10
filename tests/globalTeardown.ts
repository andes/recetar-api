import { unlinkSync } from 'fs';
import { join } from 'path';

const URI_FILE = join(__dirname, '.db-uri');

export default async function globalTeardown() {
    const mongod = (global as any).__MONGOD__;
    if (mongod) await mongod.stop();
    try { unlinkSync(URI_FILE); } catch { /* ignore */ }
}
