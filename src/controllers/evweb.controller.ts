import { Request, Response } from 'express';
import { EvwebClient } from '../services/evweb';

const evwebClient = EvwebClient.fromEnv();

class EvwebController {

    public searchCIE10 = async (req: Request, res: Response): Promise<Response> => {
        if (!evwebClient) {
            return res.status(503).json({ message: 'evWeb no está configurado' });
        }
        try {
            const { query } = req.query;
            if (!query) {
                return res.status(400).json({ message: 'El parámetro query es requerido' });
            }
            const results = await evwebClient.searchCIE10(query as string);
            return res.status(200).json(results);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error al buscar CIE-10 en evWeb:', error);
            return res.status(500).json({ message: 'Error al buscar CIE-10' });
        }
    };

    public searchMedicamentos = async (req: Request, res: Response): Promise<Response> => {
        if (!evwebClient) {
            return res.status(503).json({ message: 'evWeb no está configurado' });
        }
        try {
            const { query, monodroga } = req.query;
            if (!query) {
                return res.status(400).json({ message: 'El parámetro query es requerido' });
            }
            const results = await evwebClient.searchMedicamentos(query as string, monodroga as string);
            return res.status(200).json(results);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error al buscar medicamentos en evWeb:', error);
            return res.status(500).json({ message: 'Error al buscar medicamentos' });
        }
    };

    public searchObrasSociales = async (req: Request, res: Response): Promise<Response> => {
        if (!evwebClient) {
            return res.status(503).json({ message: 'evWeb no está configurado' });
        }
        try {
            const { query } = req.query;
            if (!query) {
                return res.status(400).json({ message: 'El parámetro query es requerido' });
            }
            const results = await evwebClient.searchObrasSociales(query as string);
            return res.status(200).json(results);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error al buscar obras sociales en evWeb:', error);
            return res.status(500).json({ message: 'Error al buscar obras sociales' });
        }
    };

    public getRecetaById = async (req: Request, res: Response): Promise<Response> => {
        if (!evwebClient) {
            return res.status(503).json({ message: 'evWeb no está configurado' });
        }
        try {
            const { id } = req.params;
            const receta = await evwebClient.getRecetaById(id);
            return res.status(200).json(receta);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error al obtener receta de evWeb:', error);
            return res.status(500).json({ message: 'Error al obtener receta' });
        }
    };

    public getRecetasByAfiliado = async (req: Request, res: Response): Promise<Response> => {
        if (!evwebClient) {
            return res.status(503).json({ message: 'evWeb no está configurado' });
        }
        try {
            const { dni } = req.params;
            if (!dni) {
                return res.status(400).json({ message: 'El DNI es requerido' });
            }
            const results = await evwebClient.getRecetasByAfiliado(parseInt(dni, 10));
            return res.status(200).json(results);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error al buscar recetas por afiliado en evWeb:', error);
            return res.status(500).json({ message: 'Error al buscar recetas' });
        }
    };

    public getRecetasByMedico = async (req: Request, res: Response): Promise<Response> => {
        if (!evwebClient) {
            return res.status(503).json({ message: 'evWeb no está configurado' });
        }
        try {
            const { cuit } = req.params;
            if (!cuit) {
                return res.status(400).json({ message: 'El CUIT es requerido' });
            }
            const results = await evwebClient.getRecetasByMedico(parseInt(cuit, 10));
            return res.status(200).json(results);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error al buscar recetas por médico en evWeb:', error);
            return res.status(500).json({ message: 'Error al buscar recetas' });
        }
    };
}

export default new EvwebController();
