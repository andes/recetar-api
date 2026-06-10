import { messages } from './es';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolve(obj: any, path: string, fallback?: string): string {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return fallback || path;
        }
    }
    return typeof current === 'string' ? current : (fallback || path);
}

export function t(path: string, fallback?: string): string {
    return resolve(messages, path, fallback);
}
