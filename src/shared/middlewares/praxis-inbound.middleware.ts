import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, NotFoundError } from '../errors';

export interface PraxisInboundGuardConfig {
    enabled: boolean;
    allowedIps: string[];
    apiKey?: string;
    enforceHttps: boolean;
    isProduction: boolean;
}

export function readPraxisInboundConfig(
    source: NodeJS.ProcessEnv = process.env,
): PraxisInboundGuardConfig {
    const allowedIps = (source.PRAXIS_INBOUND_ALLOWED_IPS || '')
        .split(',')
        .map(ip => ip.trim())
        .filter(Boolean);

    return {
        enabled: source.PRAXIS_INBOUND_ENABLED !== 'false',
        allowedIps,
        apiKey: source.PRAXIS_INBOUND_API_KEY || undefined,
        enforceHttps: source.PRAXIS_INBOUND_ENFORCE_HTTPS === 'true',
        isProduction: source.NODE_ENV === 'production',
    };
}

export function createPraxisInboundGuard(config: PraxisInboundGuardConfig) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!config.enabled) {
            return next(new NotFoundError('errors.praxisEvent.disabled'));
        }

        if (config.enforceHttps && !isSecure(req)) {
            return next(new ForbiddenError('errors.praxisEvent.httpsRequired'));
        }

        if (config.apiKey && headerValue(req, 'x-api-key') !== config.apiKey) {
            return next(new ForbiddenError('errors.praxisEvent.invalidApiKey'));
        }

        if (config.allowedIps.length === 0) {
            if (config.isProduction) {
                return next(new ForbiddenError('errors.praxisEvent.ipNotAllowed'));
            }
            return next();
        }

        const ip = clientIp(req);
        const allowed = config.allowedIps.some(rule => rule === '*' || matchesRule(ip, rule));
        if (!allowed) {
            return next(new ForbiddenError('errors.praxisEvent.ipNotAllowed'));
        }

        next();
    };
}

export const praxisInboundGuard = (req: Request, res: Response, next: NextFunction): void => {
    createPraxisInboundGuard(readPraxisInboundConfig())(req, res, next);
};

function headerValue(req: Request, name: string): string | undefined {
    const value = req.headers[name];
    return Array.isArray(value) ? value[0] : value;
}

function isSecure(req: Request): boolean {
    if (req.secure) {
        return true;
    }
    if (!req.app.get('trust proxy')) {
        return false;
    }
    return headerValue(req, 'x-forwarded-proto') === 'https';
}

function clientIp(req: Request): string {
    if (req.app.get('trust proxy')) {
        const forwarded = headerValue(req, 'x-forwarded-for');
        if (forwarded) {
            return normalizeIp(forwarded.split(',')[0].trim());
        }
    }
    return normalizeIp(req.ip || req.socket.remoteAddress || '');
}

function normalizeIp(ip: string): string {
    return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

function matchesRule(ip: string, rule: string): boolean {
    if (!rule.includes('/')) {
        return ip === rule;
    }
    const [network, bitsRaw] = rule.split('/');
    const bits = Number(bitsRaw);
    const ipOctets = parseIpv4(ip);
    const networkOctets = parseIpv4(network);
    if (!ipOctets || !networkOctets || !Number.isInteger(bits) || bits < 0 || bits > 32) {
        return false;
    }

    const fullOctets = Math.floor(bits / 8);
    for (let index = 0; index < fullOctets; index++) {
        if (ipOctets[index] !== networkOctets[index]) {
            return false;
        }
    }

    const remainingBits = bits % 8;
    if (remainingBits > 0) {
        const blockSize = Math.pow(2, 8 - remainingBits);
        if (Math.floor(ipOctets[fullOctets] / blockSize) !== Math.floor(networkOctets[fullOctets] / blockSize)) {
            return false;
        }
    }

    return true;
}

function parseIpv4(ip: string): number[] | null {
    const parts = ip.split('.');
    if (parts.length !== 4) {
        return null;
    }
    const octets: number[] = [];
    for (const part of parts) {
        if (!/^\d+$/.test(part)) {
            return null;
        }
        const octet = Number(part);
        if (octet < 0 || octet > 255) {
            return null;
        }
        octets.push(octet);
    }
    return octets;
}
