const DEFAULT_MAX_SESSION_AGE_HOURS = 12;
export const SESSION_EXPIRED_MESSAGE = 'La sesión expiró, debe volver a iniciar sesión';

export const getMaxSessionAgeHours = (): number => {
    const configuredValue = Number.parseFloat((process.env.MAX_TOKEN_AGE_HOURS || `${DEFAULT_MAX_SESSION_AGE_HOURS}`).trim());

    if (!Number.isFinite(configuredValue) || configuredValue <= 0) {
        return DEFAULT_MAX_SESSION_AGE_HOURS;
    }

    return configuredValue;
};

export const isSessionExpired = (lastLogin?: Date | string | null): boolean => {
    if (!lastLogin) {
        return true;
    }

    const sessionStartMs = new Date(lastLogin).getTime();
    if (!Number.isFinite(sessionStartMs)) {
        return true;
    }

    const maxSessionAgeMs = getMaxSessionAgeHours() * 60 * 60 * 1000;
    return (Date.now() - sessionStartMs) >= maxSessionAgeMs;
};