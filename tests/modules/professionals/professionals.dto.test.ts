import {
    createProfessionalSchema,
    updateProfessionalSchema,
} from '../../../src/modules/professionals/professionals.dto';

describe('Professionals DTOs', () => {
    describe('createProfessionalSchema', () => {
        const validData = {
            enrollment: 'MAT001',
            lastName: 'Gómez',
            firstName: 'Carlos',
        };

        it('accepts valid data', () => {
            const result = createProfessionalSchema.parse(validData);
            expect(result.enrollment).toBe('MAT001');
            expect(result.lastName).toBe('Gómez');
            expect(result.firstName).toBe('Carlos');
        });

        it('accepts optional fields', () => {
            const data = { ...validData, dni: '12345678', sex: 'Masculino', image: 'foto.jpg' };
            const result = createProfessionalSchema.parse(data);
            expect(result.dni).toBe('12345678');
            expect(result.sex).toBe('Masculino');
            expect(result.image).toBe('foto.jpg');
        });

        it('rejects missing enrollment', () => {
            expect(() => createProfessionalSchema.parse({ lastName: 'X', firstName: 'Y' })).toThrow();
        });

        it('rejects missing lastName', () => {
            expect(() => createProfessionalSchema.parse({ enrollment: 'M001', firstName: 'Y' })).toThrow();
        });

        it('rejects missing firstName', () => {
            expect(() => createProfessionalSchema.parse({ enrollment: 'M001', lastName: 'X' })).toThrow();
        });

        it('rejects invalid sex', () => {
            expect(() => createProfessionalSchema.parse({ ...validData, sex: 'Invalido' })).toThrow();
        });

        it('rejects empty enrollment', () => {
            expect(() => createProfessionalSchema.parse({ ...validData, enrollment: '' })).toThrow();
        });
    });

    describe('updateProfessionalSchema', () => {
        it('accepts partial data', () => {
            const result = updateProfessionalSchema.parse({ firstName: 'Pedro' });
            expect(result.firstName).toBe('Pedro');
        });

        it('accepts empty object', () => {
            const result = updateProfessionalSchema.parse({});
            expect(result).toEqual({});
        });

        it('rejects invalid sex', () => {
            expect(() => updateProfessionalSchema.parse({ sex: 'Invalido' })).toThrow();
        });
    });
});
