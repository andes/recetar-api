import {
    createPracticeSchema,
    updatePracticeSchema,
    searchPracticeSchema,
} from '../../../src/modules/practices/practices.dto';

describe('Practices DTOs', () => {
    describe('createPracticeSchema', () => {
        const validData = {
            date: '2025-01-15',
            patient: {
                firstName: 'Juan',
                lastName: 'Perez',
                dni: '12345678',
                sex: 'masculino',
            },
            professional: {
                userId: '000000000000000000000001',
            },
        };

        it('accepts valid data', () => {
            const result = createPracticeSchema.parse(validData);
            expect(result.date).toBe('2025-01-15');
            expect(result.patient.firstName).toBe('Juan');
            expect(result.professional.userId).toBe('000000000000000000000001');
        });

        it('accepts optional fields', () => {
            const data = {
                ...validData,
                practice: 'Radiografía',
                diagnostic: 'Sospecha de fractura',
                status: 'active' as const,
            };
            const result = createPracticeSchema.parse(data);
            expect(result.practice).toBe('Radiografía');
            expect(result.diagnostic).toBe('Sospecha de fractura');
            expect(result.status).toBe('active');
        });

        it('accepts obraSocial', () => {
            const data = {
                ...validData,
                patient: {
                    ...validData.patient,
                    obraSocial: { nombre: 'OSDE', codigoPuco: '123', numeroAfiliado: '456' },
                },
            };
            const result = createPracticeSchema.parse(data);
            expect(result.patient.obraSocial?.nombre).toBe('OSDE');
        });

        it('rejects missing date', () => {
            expect(() => createPracticeSchema.parse({ patient: validData.patient, professional: validData.professional })).toThrow();
        });

        it('rejects missing patient', () => {
            expect(() => createPracticeSchema.parse({ date: '2025-01-15', professional: validData.professional })).toThrow();
        });

        it('rejects missing professional', () => {
            expect(() => createPracticeSchema.parse({ date: '2025-01-15', patient: validData.patient })).toThrow();
        });

        it('rejects invalid status', () => {
            expect(() => createPracticeSchema.parse({ ...validData, status: 'invalid' })).toThrow();
        });
    });

    describe('updatePracticeSchema', () => {
        it('accepts partial data', () => {
            const result = updatePracticeSchema.parse({ diagnostic: 'Nuevo diagnóstico' });
            expect(result.diagnostic).toBe('Nuevo diagnóstico');
        });

        it('accepts empty object', () => {
            const result = updatePracticeSchema.parse({});
            expect(result).toEqual({});
        });

        it('rejects invalid status', () => {
            expect(() => updatePracticeSchema.parse({ status: 'invalid' })).toThrow();
        });
    });

    describe('searchPracticeSchema', () => {
        it('accepts valid data', () => {
            const result = searchPracticeSchema.parse({ searchTerm: 'Juan' });
            expect(result.searchTerm).toBe('Juan');
        });

        it('rejects missing searchTerm', () => {
            expect(() => searchPracticeSchema.parse({})).toThrow();
        });

        it('accepts skip and limit', () => {
            const result = searchPracticeSchema.parse({ searchTerm: 'Juan', skip: 10, limit: 5 });
            expect(result.skip).toBe(10);
            expect(result.limit).toBe(5);
        });
    });
});
