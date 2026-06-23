import { Router, Request, Response } from 'express';
import { createLogger } from '@andes/log';

const router = Router();
const logger = createLogger('frontend-log');

interface FrontendLogEvent {
    level: 'info' | 'warn' | 'error';
    message: string;
    request_id?: string;
    url?: string;
    error?: { message: string; stack?: string };
    data?: Record<string, unknown>;
}

router.post('/log', (req: Request, res: Response): void => {
    const { events } = req.body as { events?: FrontendLogEvent[] };

    if (!Array.isArray(events)) {
        res.status(400).json({ ok: false, message: 'events array required' });
        return;
    }

    for (const event of events) {
        const meta: Record<string, unknown> = {
            source: 'frontend',
            request_id: event.request_id,
            url: event.url,
            ...event.data,
        };
        if (event.error) {
            meta.error = event.error;
        }

        if (event.level === 'error') {
            logger.logError(new Error(event.message), meta);
        } else if (event.level === 'warn') {
            logger.logWarn(event.message, meta);
        } else {
            logger.logInfo(event.message, meta);
        }
    }

    res.json({ ok: true });
});

export default router;
