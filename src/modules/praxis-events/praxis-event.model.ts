import mongoose from 'mongoose';
import { env } from '../../config/config';
import { IPraxisEvent } from './praxis-events.types';

const configuredTtl = env.PRAXIS_INBOUND_EVENTS_TTL_DAYS;
const ttlDays = Number.isFinite(configuredTtl) && configuredTtl > 0 ? configuredTtl : 180;
const TTL_SECONDS = ttlDays * 24 * 60 * 60;

const praxisEventSchema = new mongoose.Schema({
    claveIdempotencia: { type: String, required: true, unique: true },
    tipo: {
        type: String,
        enum: ['prescripcion', 'anulacion-prescripcion', 'anulacion-receta', 'dispensa', 'anulacion-dispensa'],
        required: true,
    },
    hash: { type: String, required: true },
    recetaHash: String,
    numeroAutorizacion: String,
    payload: { type: mongoose.Schema.Types.Mixed },
    recibidoEn: { type: Date, default: Date.now },
    estado: { type: String, enum: ['procesado', 'desconocido', 'error'], default: 'procesado' },
    prescriptionId: String,
}, { timestamps: true });

praxisEventSchema.index({ recibidoEn: 1 }, { expireAfterSeconds: TTL_SECONDS });

const PraxisEvent = mongoose.models.PraxisEvent
    || mongoose.model<IPraxisEvent>('PraxisEvent', praxisEventSchema);

export default PraxisEvent;
