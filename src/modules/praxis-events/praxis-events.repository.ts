import PraxisEvent from './praxis-event.model';
import { IPraxisEvent } from './praxis-events.types';

export interface RecordPraxisEventResult {
    event: IPraxisEvent;
    duplicate: boolean;
}

export class PraxisEventsRepository {
    async record(data: Partial<IPraxisEvent>): Promise<RecordPraxisEventResult> {
        try {
            const event = await PraxisEvent.create(data);
            return { event, duplicate: false };
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                const existing = await PraxisEvent.findOne({
                    claveIdempotencia: data.claveIdempotencia,
                }).exec();
                if (existing) {
                    return { event: existing, duplicate: true };
                }
            }
            throw error;
        }
    }

    async update(id: string, data: Partial<IPraxisEvent>): Promise<IPraxisEvent | null> {
        return PraxisEvent.findByIdAndUpdate(id, data, { new: true }).exec();
    }

    async findByClave(claveIdempotencia: string): Promise<IPraxisEvent | null> {
        return PraxisEvent.findOne({ claveIdempotencia }).exec();
    }
}

function isDuplicateKeyError(error: unknown): boolean {
    return !!error
        && typeof error === 'object'
        && (error as { code?: number }).code === 11000;
}
