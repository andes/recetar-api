import { Router, Request, Response, NextFunction } from 'express';
import { checkAuth } from '../shared/middlewares/auth.middleware';
import { VademecumClient } from '../integrations/vademecum/vademecum.client';

const router = Router();
const client = new VademecumClient();

const MAX_FETCH_LIMIT = 100;

router.get('/medications', checkAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { q, snomed, offset, limit } = req.query;
        const pageOffset = Math.max(0, parseInt(offset as string, 10) || 0);
        const pageLimit = Math.max(1, parseInt(limit as string, 10) || 10);

        if (snomed) {
            const result = await client.searchMedicationsBySnomed(snomed as string);
            res.json({ status: 'success', data: { results: result ? [result] : [], total: result ? 1 : 0 } });
            return;
        }
        if (q) {
            const term = q as string;
            const tokens = term.split(/\s+/).filter(t => t.length > 0);
            const firstToken = tokens[0];
            const remainingTokens = tokens.slice(1).filter(t => t.length >= 2);

            const all = await client.searchMedications(firstToken, MAX_FETCH_LIMIT);

            let filtered = all;
            if (remainingTokens.length > 0) {
                filtered = all.filter(entry => {
                    const searchable = [
                        entry.nombre,
                        entry.presentacion,
                        entry.droga_descrip,
                        entry.accion_descrip,
                    ].filter(Boolean).join(' ').toLowerCase();
                    return remainingTokens.every(t => searchable.includes(t.toLowerCase()));
                });
            }

            const total = filtered.length;
            const results = filtered.slice(pageOffset, pageOffset + pageLimit);
            res.json({ status: 'success', data: { results, total } });
            return;
        }
        res.status(400).json({ status: 'error', error: { code: 'BAD_REQUEST', message: 'Se requiere parámetro q o snomed' } });
    } catch (error) {
        next(error);
    }
});

router.get('/medications/:id', checkAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await client.getMedicationById(Number(req.params.id));
        if (!result) {
            res.status(404).json({ status: 'error', error: { code: 'NOT_FOUND', message: 'Medicamento no encontrado' } });
            return;
        }
        res.json({ status: 'success', data: result });
    } catch (error) {
        next(error);
    }
});

router.get('/drugs', checkAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { q, limit } = req.query;
        const result = await client.searchDrugs(q as string, Number(limit) || 20);
        res.json({ status: 'success', data: result });
    } catch (error) {
        next(error);
    }
});

router.get('/actions', checkAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { q, limit } = req.query;
        const result = await client.searchActions(q as string, Number(limit) || 20);
        res.json({ status: 'success', data: result });
    } catch (error) {
        next(error);
    }
});

router.get('/stats', checkAuth, async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await client.getStats();
        res.json({ status: 'success', data: result });
    } catch (error) {
        next(error);
    }
});

export default router;
