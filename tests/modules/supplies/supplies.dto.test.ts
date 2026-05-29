import {
    createSupplySchema,
    updateSupplySchema,
} from '../../../src/modules/supplies/supplies.dto';

describe('Supplies DTOs', () => {
    describe('createSupplySchema', () => {
        const validData = {
            name: 'Ibuprofeno 400mg',
        };

        it('accepts valid data', () => {
            const result = createSupplySchema.parse(validData);
            expect(result.name).toBe('Ibuprofeno 400mg');
        });

        it('accepts optional fields', () => {
            const data = { ...validData, activePrinciple: 'Ibuprofeno', pharmaceutical_form: 'comprimidos', status: 'active' };
            const result = createSupplySchema.parse(data);
            expect(result.activePrinciple).toBe('Ibuprofeno');
            expect(result.pharmaceutical_form).toBe('comprimidos');
            expect(result.status).toBe('active');
        });

        it('accepts snomedConcept and code', () => {
            const data = { ...validData, snomedConcept: { conceptId: '123', term: 'Test' }, code: { source: 'SIFAHO' as const, value: 'ABC' } };
            const result = createSupplySchema.parse(data);
            expect(result.snomedConcept?.conceptId).toBe('123');
            expect(result.code?.source).toBe('SIFAHO');
        });

        it('rejects missing name', () => {
            expect(() => createSupplySchema.parse({})).toThrow();
        });

        it('rejects empty name', () => {
            expect(() => createSupplySchema.parse({ name: '' })).toThrow();
        });

        it('rejects invalid status', () => {
            expect(() => createSupplySchema.parse({ ...validData, status: 'invalid' })).toThrow();
        });

        it('rejects invalid code source', () => {
            expect(() => createSupplySchema.parse({ ...validData, code: { source: 'OTHER' } })).toThrow();
        });
    });

    describe('updateSupplySchema', () => {
        it('accepts partial data', () => {
            const result = updateSupplySchema.parse({ name: 'Paracetamol 500mg' });
            expect(result.name).toBe('Paracetamol 500mg');
        });

        it('accepts empty object', () => {
            const result = updateSupplySchema.parse({});
            expect(result).toEqual({});
        });

        it('rejects invalid status', () => {
            expect(() => updateSupplySchema.parse({ status: 'invalid' })).toThrow();
        });
    });
});
