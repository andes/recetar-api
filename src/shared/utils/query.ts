export function getStringQueryParam(value: unknown): string | undefined {
    if (typeof value === 'string') {
        return value;
    }

    if (Array.isArray(value)) {
        return value.find((item): item is string => typeof item === 'string');
    }

    return undefined;
}
