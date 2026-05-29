import {
    listUsersSchema,
    createUserSchema,
    updateUserSchema,
    requestEmailUpdateSchema,
    confirmEmailUpdateSchema,
    updateOwnOrganizacionesSchema,
    organizacionesAndesSchema,
} from '../../../src/modules/users/users.dto';

describe('Users DTOs', () => {
    describe('listUsersSchema', () => {
        it('accepts empty params', () => {
            const result = listUsersSchema.parse({});
            expect(result.searchTerm).toBeUndefined();
        });

        it('accepts searchTerm', () => {
            const result = listUsersSchema.parse({ searchTerm: 'test' });
            expect(result.searchTerm).toBe('test');
        });

        it('accepts valid offset and limit', () => {
            const result = listUsersSchema.parse({ offset: '0', limit: '50' });
            expect(result.offset).toBe(0);
            expect(result.limit).toBe(50);
        });

        it('rejects limit over 100', () => {
            expect(() => listUsersSchema.parse({ limit: '200' })).toThrow();
        });

        it('rejects negative offset', () => {
            expect(() => listUsersSchema.parse({ offset: '-1' })).toThrow();
        });
    });

    describe('createUserSchema', () => {
        const validData = {
            password: 'password123',
            roles: ['507f1f77bcf86cd799439011'],
        };

        it('accepts valid data', () => {
            const result = createUserSchema.parse(validData);
            expect(result.password).toBe('password123');
            expect(result.roles).toHaveLength(1);
        });

        it('accepts optional fields', () => {
            const data = {
                ...validData,
                email: 'test@example.com',
                username: 'testuser',
                businessName: 'Test User',
                enrollment: 'ENR-001',
                cuil: '20-12345678-9',
            };
            const result = createUserSchema.parse(data);
            expect(result.email).toBe('test@example.com');
            expect(result.username).toBe('testuser');
        });

        it('accepts profesionGrado', () => {
            const data = {
                ...validData,
                profesionGrado: [{
                    profesion: 'Medicina',
                    codigoProfesion: 'MED-001',
                    numeroMatricula: '12345',
                }],
            };
            const result = createUserSchema.parse(data);
            expect(result.profesionGrado).toHaveLength(1);
        });

        it('rejects missing password', () => {
            expect(() => createUserSchema.parse({ roles: ['id'] })).toThrow();
        });

        it('rejects short password', () => {
            expect(() => createUserSchema.parse({ password: '123', roles: ['id'] })).toThrow();
        });

        it('rejects missing roles', () => {
            expect(() => createUserSchema.parse({ password: 'password123' })).toThrow();
        });

        it('rejects empty roles', () => {
            expect(() => createUserSchema.parse({ password: 'password123', roles: [] })).toThrow();
        });

        it('rejects empty username with single role', () => {
            expect(() => createUserSchema.parse({ password: 'password123', roles: ['id'], username: '' })).toThrow();
        });
    });

    describe('updateUserSchema', () => {
        it('accepts partial data', () => {
            const result = updateUserSchema.parse({ email: 'new@example.com' });
            expect(result.email).toBe('new@example.com');
        });

        it('accepts empty object', () => {
            const result = updateUserSchema.parse({});
            expect(result).toEqual({});
        });

        it('accepts isActive boolean', () => {
            const result = updateUserSchema.parse({ isActive: false });
            expect(result.isActive).toBe(false);
        });

        it('rejects invalid email', () => {
            expect(() => updateUserSchema.parse({ email: 'invalid' })).toThrow();
        });

        it('accepts roles array', () => {
            const result = updateUserSchema.parse({ roles: ['507f1f77bcf86cd799439011'] });
            expect(result.roles).toHaveLength(1);
        });
    });

    describe('requestEmailUpdateSchema', () => {
        it('accepts valid email', () => {
            const result = requestEmailUpdateSchema.parse({ email: 'new@example.com' });
            expect(result.email).toBe('new@example.com');
        });

        it('rejects missing email', () => {
            expect(() => requestEmailUpdateSchema.parse({})).toThrow();
        });

        it('rejects invalid email', () => {
            expect(() => requestEmailUpdateSchema.parse({ email: 'not-an-email' })).toThrow();
        });
    });

    describe('confirmEmailUpdateSchema', () => {
        it('accepts valid token', () => {
            const result = confirmEmailUpdateSchema.parse({ token: 'abc123' });
            expect(result.token).toBe('abc123');
        });

        it('rejects missing token', () => {
            expect(() => confirmEmailUpdateSchema.parse({})).toThrow();
        });

        it('rejects empty token', () => {
            expect(() => confirmEmailUpdateSchema.parse({ token: '' })).toThrow();
        });
    });

    describe('updateOwnOrganizacionesSchema', () => {
        it('accepts valid organizaciones', () => {
            const result = updateOwnOrganizacionesSchema.parse({
                organizaciones: [{ nombre: 'Hospital' }],
            });
            expect(result.organizaciones).toHaveLength(1);
        });

        it('accepts organizaciones with direccion', () => {
            const result = updateOwnOrganizacionesSchema.parse({
                organizaciones: [{ nombre: 'Hospital', direccion: 'Calle 123' }],
            });
            expect(result.organizaciones[0].direccion).toBe('Calle 123');
        });

        it('rejects missing organizaciones', () => {
            expect(() => updateOwnOrganizacionesSchema.parse({})).toThrow();
        });
    });

    describe('organizacionesAndesSchema', () => {
        it('accepts nombre', () => {
            const result = organizacionesAndesSchema.parse({ nombre: 'Hospital' });
            expect(result.nombre).toBe('Hospital');
        });

        it('rejects missing nombre', () => {
            expect(() => organizacionesAndesSchema.parse({})).toThrow();
        });
    });
});
