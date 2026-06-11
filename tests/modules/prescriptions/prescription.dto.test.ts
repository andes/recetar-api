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

        it('accepts tratamientoProlongado within 2-12 months', () => {
            expect(createPrescriptionSchema.parse({ ...validData, tratamientoProlongado: 2 }).tratamientoProlongado).toBe(2);
            expect(createPrescriptionSchema.parse({ ...validData, tratamientoProlongado: 3 }).tratamientoProlongado).toBe(3);
            expect(createPrescriptionSchema.parse({ ...validData, tratamientoProlongado: 6 }).tratamientoProlongado).toBe(6);
            expect(createPrescriptionSchema.parse({ ...validData, tratamientoProlongado: 12 }).tratamientoProlongado).toBe(12);
        });

        it('rejects tratamientoProlongado below 2 or above 12', () => {
            expect(() => createPrescriptionSchema.parse({ ...validData, tratamientoProlongado: 1 })).toThrow();
            expect(() => createPrescriptionSchema.parse({ ...validData, tratamientoProlongado: 13 })).toThrow();
        });

        it('rejects a non-integer tratamientoProlongado', () => {
            expect(() => createPrescriptionSchema.parse({ ...validData, tratamientoProlongado: 4.5 })).toThrow();
        });

        it('accepts a per-supply tratamientoProlongado within 2-12 months', () => {
            const data = {
                ...validData,
                supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 10, tratamientoProlongado: 6 }],
            };
            const result = createPrescriptionSchema.parse(data);
            expect(result.supplies[0].tratamientoProlongado).toBe(6);
        });

        it('rejects a per-supply tratamientoProlongado out of range', () => {
            const data = {
                ...validData,
                supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 10, tratamientoProlongado: 1 }],
            };
            expect(() => createPrescriptionSchema.parse(data)).toThrow();
        });

        it('accepts numeric obraSocial codigoPuco', () => {
            const data = {
                ...validData,
                supplies: [{
                    supply: { name: 'Ibuprofeno 400mg' },
                    quantity: 1,
                    obraSocial: { nombre: 'OSDE', codigoPuco: 123, numeroAfiliado: '456' },
                }],
            };
            const result = createPrescriptionSchema.parse(data);
            expect(result.supplies[0].obraSocial?.codigoPuco).toBe(123);
        });

        it('rejects string obraSocial codigoPuco', () => {
            const data = {
                ...validData,
                supplies: [{
                    supply: { name: 'Ibuprofeno 400mg' },
                    quantity: 1,
                    obraSocial: { nombre: 'OSDE', codigoPuco: '123', numeroAfiliado: '456' },
                }],
            };
            expect(() => createPrescriptionSchema.parse(data)).toThrow();
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
