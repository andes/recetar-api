import { Request, Response } from 'express';
import AndesService from '../services/andesService';

class AndesStockController {

    public search = async (req: Request, res: Response): Promise<Response> => {
        try {
            const insumo = req.query.insumo as string;
            const tipos = req.query.tipos as string;

            if (!insumo) {
                return res.status(400).json({ mensaje: 'Missing required param: insumo' });
            }

            const result = await AndesService.searchStock({ insumo, tipos });
            return res.status(200).json(result);
        } catch (e) {
            return res.status(500).json({ mensaje: 'Error', error: e });
        }
    };

    public getStock = async (req: Request, res: Response): Promise<Response> => {
        try {
            const result = await AndesService.getAllStock();
            return res.status(200).json(result);
        } catch (e) {
            return res.status(500).json({ mensaje: 'Error', error: e });
        }
    };

}

export default new AndesStockController();
