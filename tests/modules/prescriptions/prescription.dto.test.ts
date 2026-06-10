import {
    createPrescriptionSchema,
    updatePrescriptionSchema,
    dispensePrescriptionSchema,
} from '../../../src/modules/prescriptions/prescription.dto';

describe('Prescription DTOs', () => {
    describe('createPrescriptionSchema', () => {
        const validData = {
            patient: {
                firstName: 'Juan',
                lastName: 'Pérez',
                dni: '12345678',
                sex: 'Masculino',
            },
            professional: {
                userId: 'prof123',
                businessName: 'Dr. Gómez',
            },
            supplies: [{
                supply: { name: 'Ibuprofeno 400mg', type: 'device' },
                quantity: 10,
            }],
        };

        it('accepts valid data', () => {
            const result = createPrescriptionSchema.parse(validData);
            expect(result.patient.firstName).toBe('Juan');
            expect(result.supplies).toHaveLength(1);
        });

        it('accepts optional ambito and trimestral', () => {
            const data = { ...validData, ambito: 'publico' as const, trimestral: true };
            const result = createPrescriptionSchema.parse(data);
            expect(result.ambito).toBe('publico');
            expect(result.trimestral).toBe(true);
        });

        it('rejects missing patient', () => {
            const { patient: _, ...rest } = validData as any;
            expect(() => createPrescriptionSchema.parse(rest)).toThrow();
        });

        it('rejects empty supplies', () => {
            expect(() => createPrescriptionSchema.parse({ ...validData, supplies: [] })).toThrow();
        });

        it('rejects invalid ambito', () => {
            expect(() => createPrescriptionSchema.parse({ ...validData, ambito: 'invalid' })).toThrow();
        });
    });

    describe('updatePrescriptionSchema', () => {
        it('accepts partial data', () => {
            const result = updatePrescriptionSchema.parse({ date: '2024-01-01' });
            expect(result.date).toBe('2024-01-01');
        });

        it('accepts empty object', () => {
            const result = updatePrescriptionSchema.parse({});
            expect(result).toEqual({});
        });
    });

    describe('dispensePrescriptionSchema', () => {
        it('accepts valid data', () => {
            const result = dispensePrescriptionSchema.parse({
                userId: 'farm123',
                businessName: 'Farm. López',
            });
            expect(result.userId).toBe('farm123');
        });

        it('rejects missing userId', () => {
            expect(() => dispensePrescriptionSchema.parse({ businessName: 'Test' })).toThrow();
        });
    });
});
