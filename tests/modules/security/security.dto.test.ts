import {
    setupSecurityPinSchema,
    changeSecurityPinSchema,
    disableSecurityPinSchema,
} from '../../../src/modules/security/security.dto';

describe('Security DTOs', () => {
    describe('setupSecurityPinSchema', () => {
        it('should validate correct data', () => {
            const data = {
                currentPassword: 'password123',
                pin: '1234'
            };

            const result = setupSecurityPinSchema.safeParse(data);

            expect(result.success).toBe(true);
        });

        it('should reject invalid PIN format', () => {
            const data = {
                currentPassword: 'password123',
                pin: '123'
            };

            const result = setupSecurityPinSchema.safeParse(data);

            expect(result.success).toBe(false);
        });

        it('should reject PIN with letters', () => {
            const data = {
                currentPassword: 'password123',
                pin: '12ab'
            };

            const result = setupSecurityPinSchema.safeParse(data);

            expect(result.success).toBe(false);
        });

        it('should reject missing currentPassword', () => {
            const data = {
                pin: '1234'
            };

            const result = setupSecurityPinSchema.safeParse(data);

            expect(result.success).toBe(false);
        });
    });

    describe('changeSecurityPinSchema', () => {
        it('should validate correct data', () => {
            const data = {
                currentPin: '1234',
                newPin: '5678'
            };

            const result = changeSecurityPinSchema.safeParse(data);

            expect(result.success).toBe(true);
        });

        it('should reject invalid currentPin format', () => {
            const data = {
                currentPin: '123',
                newPin: '5678'
            };

            const result = changeSecurityPinSchema.safeParse(data);

            expect(result.success).toBe(false);
        });

        it('should reject invalid newPin format', () => {
            const data = {
                currentPin: '1234',
                newPin: '567'
            };

            const result = changeSecurityPinSchema.safeParse(data);

            expect(result.success).toBe(false);
        });
    });

    describe('disableSecurityPinSchema', () => {
        it('should validate correct data', () => {
            const data = {
                password: 'password123'
            };

            const result = disableSecurityPinSchema.safeParse(data);

            expect(result.success).toBe(true);
        });

        it('should reject missing password', () => {
            const data = {};

            const result = disableSecurityPinSchema.safeParse(data);

            expect(result.success).toBe(false);
        });

        it('should reject empty password', () => {
            const data = {
                password: ''
            };

            const result = disableSecurityPinSchema.safeParse(data);

            expect(result.success).toBe(false);
        });
    });
});
