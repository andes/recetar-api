import { Types } from 'mongoose';

export function toObjectId(value: string | Types.ObjectId | undefined | null): Types.ObjectId | undefined {
    if (!value) {
        return undefined;
    }

    if (value instanceof Types.ObjectId) {
        return value;
    }

    if (Types.ObjectId.isValid(value)) {
        return new Types.ObjectId(value);
    }

    return undefined;
}
