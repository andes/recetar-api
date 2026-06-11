import { SecurityPinUtils } from '../../../src/modules/security/security-pin.utils';

describe('SecurityPinUtils', () => {
    describe('hashPin', () => {
        it('should hash a PIN successfully', async () => {
            const pin = '1234';
            const hash = await SecurityPinUtils.hashPin(pin);

            expect(hash).toBeDefined();
            expect(hash).not.toBe(pin);
            expect(hash.length).toBeGreaterThan(0);
        });

        it('should generate different hashes for the same PIN', async () => {
            const pin = '1234';
            const hash1 = await SecurityPinUtils.hashPin(pin);
            const hash2 = await SecurityPinUtils.hashPin(pin);

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('verifyPin', () => {
        it('should verify a correct PIN', async () => {
            const pin = '1234';
            const hash = await SecurityPinUtils.hashPin(pin);

            const isValid = await SecurityPinUtils.verifyPin(pin, hash);

            expect(isValid).toBe(true);
        });

        it('should reject an incorrect PIN', async () => {
            const pin = '1234';
            const hash = await SecurityPinUtils.hashPin(pin);

            const isValid = await SecurityPinUtils.verifyPin('5678', hash);

            expect(isValid).toBe(false);
        });
    });
});
