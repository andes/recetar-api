import { Request, Response } from 'express';
import Prescription from '../models/prescription.model';

class StockController {

    public getStock = async (req: Request, res: Response): Promise<Response> => {
        try {
            const prescriptions = await Prescription.find({ 'supplies.supply.type': { $exists: true } }).limit(100).sort({ date: -1 });

            return res.status(200).json(prescriptions);
        } catch (e) {
            return res.status(500).json({ mensaje: 'Error', error: e });
        }
    };
}

export default new StockController();
