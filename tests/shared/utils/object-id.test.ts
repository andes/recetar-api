import { Types } from 'mongoose';
import { toObjectId } from '../../../src/shared/utils/object-id';

describe('toObjectId', () => {
    const hexId = '000000000000000000000001';

    it('converts a valid hex string to ObjectId', () => {
        const result = toObjectId(hexId);
        expect(result).toBeInstanceOf(Types.ObjectId);
        expect(result?.toString()).toBe(hexId);
    });

    it('returns the same ObjectId when already an ObjectId', () => {
        const objectId = new Types.ObjectId(hexId);
        expect(toObjectId(objectId)).toBe(objectId);
    });

    it('returns undefined for undefined and null', () => {
        expect(toObjectId(undefined)).toBeUndefined();
        expect(toObjectId(null)).toBeUndefined();
    });

    it('returns undefined for invalid values', () => {
        expect(toObjectId('not-an-object-id')).toBeUndefined();
        expect(toObjectId('123')).toBeUndefined();
    });
});