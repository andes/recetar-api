import { Request, Response } from 'express';
import Prescription from '../models/prescription.model';
import User from '../models/user.model';
import AndesService from '../services/andesService';

class StockController {

    public getStock = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { userId, ambito = 'privado' } = req.query;
            let professionalId = userId as string;

            if (!professionalId && (req as any).user) {
                professionalId = (req as any).user._id || (req as any).user.id;
            }

            // 1. Obtener prescripciones de insumos locales
            const query: any = { 'supplies.supply.type': { $exists: true } };
            if (professionalId) {
                query['professional.userId'] = professionalId;
            }

            const localPrescriptions = await Prescription.find(query).limit(100).sort({ date: -1 });

            // 2. Si es ámbito público o si tenemos profesional, consultar ANDES recetasInsumos
            let andesInsumoPrescriptions: any[] = [];
            let professional = null;

            if (professionalId) {
                professional = await User.findOne({ _id: professionalId });
            } else if ((req as any).user?.id) {
                professional = await User.findOne({ _id: (req as any).user.id });
            }

            if (professional?.idAndes && (ambito === 'publico' || !ambito)) {
                andesInsumoPrescriptions = await AndesService.getInsumoPrescriptionsByProfessional({
                    professionalId: professional.idAndes
                }).catch((err) => {
                    // eslint-disable-next-line no-console
                    console.error('Error al consultar recetasInsumos de ANDES:', err);
                    return [];
                });
                console.log('*** ANDESINSUMO PRESCRIPTIONS ', andesInsumoPrescriptions)
            }

            // Transformar las prescripciones de insumos de ANDES al formato esperado por el frontend
            const transformedAndes = (andesInsumoPrescriptions || []).map(item => ({
                ...item,
                _id: item.id || item._id,
                isFromAndes: true,
                date: new Date(item.fechaPrestacion || item.fechaRegistro || item.origenExterno?.fecha || item.createdAt || new Date()),
                status: (item.estadoActual?.tipo || item.status || 'VIGENTE').toUpperCase(),
                professional: item.profesional ? {
                    userId: item.profesional.id || item.profesional._id,
                    businessName: item.profesional.businessName || `${item.profesional.apellido || ''} ${item.profesional.nombre || ''}`.trim() || 'Profesional',
                    enrollment: item.profesional.matricula || item.profesional.enrollment || '',
                    nombre: item.profesional.nombre || '',
                    apellido: item.profesional.apellido || '',
                    documento: item.profesional.documento || ''
                } : (item.professional || { businessName: 'Profesional' }),
                patient: item.paciente ? {
                    _id: item.paciente.id || item.paciente._id,
                    firstName: item.paciente.nombre || '',
                    lastName: item.paciente.apellido || '',
                    dni: item.paciente.documento || '',
                    sex: item.paciente.sexo || item.paciente.genero || '',
                    fechaNac: item.paciente.fechaNacimiento || null,
                    obraSocial: item.paciente.obraSocial || null
                } : item.patient,
                paciente: item.paciente,
                supplies: item.insumo ? [{
                    supply: {
                        name: item.insumo.nombre || item.insumo.concepto?.term || 'Insumo',
                        type: item.insumo.tipo || 'dispositivo',
                        specification: item.insumo.especificacion || ''
                    },
                    quantity: item.insumo.cantidad || 1,
                    quantityPresentation: item.insumo.cantidad || 1
                }] : (item.supplies || [])
            }));

            const combined = [...localPrescriptions, ...transformedAndes];
            combined.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return res.status(200).json(combined);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Error en StockController.getStock:', e);
            return res.status(500).json({ mensaje: 'Error', error: e });
        }
    };
}

export default new StockController();
