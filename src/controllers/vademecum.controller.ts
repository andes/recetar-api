import { Request, Response } from 'express';
import { BaseController } from '../interfaces/classes/base-controllers.interface';
import vademecumService from '../services/vademecumService';

class VademecumController implements BaseController {
    public index = async (req: Request, res: Response): Promise<Response> => {
        try {
            const q = req.query.q as string | undefined;
            const snomed = req.query.snomed as string | undefined;
            const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);

            if (snomed) {
                const result = await vademecumService.getMedicationBySnomed(snomed);
                return res.status(200).json({ results: result ? [result] : [], total: result ? 1 : 0 });
            }

            if (q) {
                const results = await vademecumService.searchMedications(q, limit);
                return res.status(200).json({ results, total: results.length });
            }

            return res.status(400).json({ mensaje: 'Se requiere parámetro q o snomed' });
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log(e);
            return res.status(500).json({ mensaje: 'Error', error: e });
        }
    };

    public create = async (req: Request, res: Response): Promise<Response> => {
        return res.status(200);
    };

    public show = async (req: Request, res: Response): Promise<Response> => {
        try {
            const id = parseInt(req.params.id, 10);
            const result = await vademecumService.getMedicationById(id);
            if (!result) {
                return res.status(404).json({ mensaje: 'Medicamento no encontrado' });
            }
            return res.status(200).json(result);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log(e);
            return res.status(500).json({ mensaje: 'Error', error: e });
        }
    };

    public update = async (req: Request, res: Response): Promise<Response> => {
        return res.status(200);
    };

    public delete = async (req: Request, res: Response): Promise<Response> => {
        return res.status(200);
    };
}

export default new VademecumController();
