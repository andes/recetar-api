import {
    andesDispenseSchema,
    andesCancelDispenseSchema,
    andesSuspendSchema,
    verifyRecetaSchema,
} from '../../../src/integrations/andes';

describe('ANDES DTOs', () => {
    describe('andesDispenseSchema', () => {
        it('accepts valid data', () => {
            const result = andesDispenseSchema.parse({
                recetaId: 'andes123',
                descripcion: 'Dispensado',
                cantidad: 1,
            });
            expect(result.recetaId).toBe('andes123');
        });

        it('rejects missing recetaId', () => {
            expect(() => andesDispenseSchema.parse({ descripcion: 'Test', cantidad: 1 })).toThrow();
        });
    });

    describe('andesCancelDispenseSchema', () => {
        it('accepts valid data', () => {
            const result = andesCancelDispenseSchema.parse({
                recetaId: 'andes123',
                idDispensaApp: 'disp123',
            });
            expect(result.recetaId).toBe('andes123');
        });
    });

    describe('andesSuspendSchema', () => {
        it('accepts valid data', () => {
            const result = andesSuspendSchema.parse({
                recetaId: 'andes123',
                motivo: 'Cambio de tratamiento',
            });
            expect(result.motivo).toBe('Cambio de tratamiento');
        });

        it('rejects missing motivo', () => {
            expect(() => andesSuspendSchema.parse({ recetaId: 'andes123' })).toThrow();
        });
    });

    describe('verifyRecetaSchema', () => {
        it('accepts valid data', () => {
            const result = verifyRecetaSchema.parse({
                dni: '12345678',
                conceptId: '12345',
                sexo: 'masculino',
            });
            expect(result.dni).toBe('12345678');
        });

        it('rejects missing dni', () => {
            expect(() => verifyRecetaSchema.parse({ conceptId: '123', sexo: 'm' })).toThrow();
        });
    });
});
