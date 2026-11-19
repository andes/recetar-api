import PraxysEvent from './praxys-event.model';
import { IPraxysEvent } from './praxys-events.types';

export interface RecordPraxysEventResult {
    event: IPraxysEvent;
    duplicate: boolean;
}

export class PraxysEventsRepository {
    async record(data: Partial<IPraxysEvent>): Promise<RecordPraxysEventResult> {
        try {
            const event = await PraxysEvent.create(data);
            return { event, duplicate: false };
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                const existing = await PraxysEvent.findOne({
                    claveIdempotencia: data.claveIdempotencia,
                }).exec();
                if (existing) {
                    return { event: existing, duplicate: true };
                }
            }
            throw error;
        }
    }

    async update(id: string, data: Partial<IPraxysEvent>): Promise<IPraxysEvent | null> {
        return PraxysEvent.findByIdAndUpdate(id, data, { new: true }).exec();
    }

    async findByClave(claveIdempotencia: string): Promise<IPraxysEvent | null> {
        return PraxysEvent.findOne({ claveIdempotencia }).exec();
    }
}

function isDuplicateKeyError(error: unknown): boolean {
    return !!error
        && typeof error === 'object'
        && (error as { code?: number }).code === 11000;
}
