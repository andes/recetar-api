import {
    loginSchema,
    registerSchema,
    refreshSchema,
    resetPasswordSchema,
    recoverPasswordSchema,
} from '../../../src/modules/auth/auth.dto';

describe('Auth DTOs', () => {
    describe('loginSchema', () => {
        it('accepts valid login data', () => {
            const result = loginSchema.parse({ identifier: 'test@test.com', password: '12345678' });
            expect(result).toEqual({ identifier: 'test@test.com', password: '12345678' });
        });

        it('rejects empty identifier', () => {
            expect(() => loginSchema.parse({ identifier: '', password: '12345678' })).toThrow();
        });

        it('rejects empty password', () => {
            expect(() => loginSchema.parse({ identifier: 'test', password: '' })).toThrow();
        });

        it('rejects missing fields', () => {
            expect(() => loginSchema.parse({})).toThrow();
        });
    });

    describe('registerSchema', () => {
        const validData = {
            username: 'testuser',
            email: 'test@test.com',
            password: '12345678',
            roleType: 'professional',
            captcha: 'some-captcha',
        };

        it('accepts valid register data', () => {
            const result = registerSchema.parse(validData);
            expect(result.username).toBe('testuser');
        });

        it('rejects short password', () => {
            expect(() => registerSchema.parse({ ...validData, password: '123' })).toThrow();
        });

        it('rejects missing captcha', () => {
            expect(() => registerSchema.parse({ ...validData, captcha: '' })).toThrow();
        });

        it('accepts optional fields', () => {
            const data = { ...validData, businessName: 'Test Pharmacy', enrollment: 'EN001', cuil: '20-12345678-9' };
            const result = registerSchema.parse(data);
            expect(result.businessName).toBe('Test Pharmacy');
        });
    });

    describe('refreshSchema', () => {
        it('accepts valid refresh token', () => {
            const result = refreshSchema.parse({ refreshToken: 'uuid-token' });
            expect(result.refreshToken).toBe('uuid-token');
        });

        it('rejects empty refresh token', () => {
            expect(() => refreshSchema.parse({ refreshToken: '' })).toThrow();
        });
    });

    describe('resetPasswordSchema', () => {
        it('accepts valid data', () => {
            const result = resetPasswordSchema.parse({ oldPassword: 'oldpass', newPassword: 'newpass123' });
            expect(result.newPassword).toBe('newpass123');
        });

        it('rejects weak new password', () => {
            expect(() => resetPasswordSchema.parse({ oldPassword: 'old', newPassword: 'short' })).toThrow();
        });
    });

    describe('recoverPasswordSchema', () => {
        it('accepts valid data', () => {
            const result = recoverPasswordSchema.parse({ authenticationToken: 'token-123', newPassword: 'newpass123' });
            expect(result.authenticationToken).toBe('token-123');
        });

        it('rejects empty authentication token', () => {
            expect(() => recoverPasswordSchema.parse({ authenticationToken: '', newPassword: 'newpass123' })).toThrow();
        });
    });
});
