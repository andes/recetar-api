import {
    createPharmacistSchema,
    updatePharmacistSchema,
    createPharmacySchema,
    updatePharmacySchema,
} from '../../../src/modules/pharmacists/pharmacists.dto';

describe('Pharmacists DTOs', () => {
    describe('createPharmacistSchema', () => {
        const validData = {
            enrollment: 'FARM001',
            lastName: 'López',
            firstName: 'María',
            sex: 'Femenino' as const,
        };

        it('accepts valid data', () => {
            const result = createPharmacistSchema.parse(validData);
            expect(result.enrollment).toBe('FARM001');
            expect(result.sex).toBe('Femenino');
        });

        it('rejects missing enrollment', () => {
            expect(() => createPharmacistSchema.parse({ lastName: 'X', firstName: 'Y', sex: 'Masculino' })).toThrow();
        });

        it('rejects missing sex', () => {
            expect(() => createPharmacistSchema.parse({ enrollment: 'F001', lastName: 'X', firstName: 'Y' })).toThrow();
        });

        it('rejects invalid sex', () => {
            expect(() => createPharmacistSchema.parse({ ...validData, sex: 'Invalido' })).toThrow();
        });

        it('accepts optional image', () => {
            const result = createPharmacistSchema.parse({ ...validData, image: 'foto.jpg' });
            expect(result.image).toBe('foto.jpg');
        });
    });

    describe('updatePharmacistSchema', () => {
        it('accepts partial data', () => {
            const result = updatePharmacistSchema.parse({ firstName: 'Ana' });
            expect(result.firstName).toBe('Ana');
        });

        it('accepts empty object', () => {
            expect(() => updatePharmacistSchema.parse({})).not.toThrow();
        });

        it('rejects invalid sex', () => {
            expect(() => updatePharmacistSchema.parse({ sex: 'Invalido' })).toThrow();
        });
    });

    describe('createPharmacySchema', () => {
        const validObjectId = '000000000000000000000000';
        const validData = {
            cuit: '30-12345678-9',
            name: 'Farmacia Central',
            city: 'Ciudad',
            pharmacist: validObjectId,
        };

        it('accepts valid data', () => {
            const result = createPharmacySchema.parse(validData);
            expect(result.cuit).toBe('30-12345678-9');
            expect(result.name).toBe('Farmacia Central');
        });

        it('rejects missing cuit', () => {
            expect(() => createPharmacySchema.parse({ name: 'X', city: 'Y', pharmacist: validObjectId })).toThrow();
        });

        it('rejects missing name', () => {
            expect(() => createPharmacySchema.parse({ cuit: '30-1', city: 'Y', pharmacist: validObjectId })).toThrow();
        });

        it('rejects invalid pharmacist ObjectId', () => {
            expect(() => createPharmacySchema.parse({ ...validData, pharmacist: 'not-an-objectid' })).toThrow();
        });

        it('accepts optional fields', () => {
            const data = { ...validData, address: 'Calle 123', image: 'local.jpg' };
            const result = createPharmacySchema.parse(data);
            expect(result.address).toBe('Calle 123');
            expect(result.image).toBe('local.jpg');
        });
    });

    describe('updatePharmacySchema', () => {
        it('accepts partial data', () => {
            const result = updatePharmacySchema.parse({ name: 'Nueva Farmacia' });
            expect(result.name).toBe('Nueva Farmacia');
        });

        it('accepts empty object', () => {
            expect(() => updatePharmacySchema.parse({})).not.toThrow();
        });
    });
});
