import {
    createCertificateSchema,
    updateCertificateSchema,
    searchCertificateSchema,
} from '../../../src/modules/certificates/certificates.dto';

describe('Certificates DTOs', () => {
    describe('createCertificateSchema', () => {
        const validData = {
            patient: {
                firstName: 'Juan',
                lastName: 'Perez',
                dni: '12345678',
                sex: 'Masculino',
            },
            professional: {
                userId: '000000000000000000000001',
                businessName: 'Dr. Gomez',
            },
            startDate: '2025-01-15',
            cantDias: 10,
        };

        it('accepts valid data', () => {
            const result = createCertificateSchema.parse(validData);
            expect(result.patient.firstName).toBe('Juan');
            expect(result.professional.businessName).toBe('Dr. Gomez');
            expect(result.cantDias).toBe(10);
        });

        it('accepts optional fields', () => {
            const data = {
                ...validData,
                certificate: 'Paciente presenta síntomas de...',
                professional: { ...validData.professional, cuil: '20-12345678-9', enrollment: 'MAT001' },
            };
            const result = createCertificateSchema.parse(data);
            expect(result.certificate).toBe('Paciente presenta síntomas de...');
            expect(result.professional.cuil).toBe('20-12345678-9');
        });

        it('rejects missing patient', () => {
            expect(() => createCertificateSchema.parse({ professional: validData.professional, startDate: '2025-01-15', cantDias: 10 })).toThrow();
        });

        it('rejects missing professional', () => {
            expect(() => createCertificateSchema.parse({ patient: validData.patient, startDate: '2025-01-15', cantDias: 10 })).toThrow();
        });

        it('rejects missing startDate', () => {
            expect(() => createCertificateSchema.parse({ patient: validData.patient, professional: validData.professional, cantDias: 10 })).toThrow();
        });

        it('rejects missing cantDias', () => {
            expect(() => createCertificateSchema.parse({ patient: validData.patient, professional: validData.professional, startDate: '2025-01-15' })).toThrow();
        });

        it('rejects negative cantDias', () => {
            expect(() => createCertificateSchema.parse({ ...validData, cantDias: -1 })).toThrow();
        });
    });

    describe('updateCertificateSchema', () => {
        it('accepts partial data', () => {
            const result = updateCertificateSchema.parse({ anulateReason: 'Error en el diagnóstico' });
            expect(result.anulateReason).toBe('Error en el diagnóstico');
        });

        it('accepts empty object', () => {
            const result = updateCertificateSchema.parse({});
            expect(result).toEqual({});
        });
    });

    describe('searchCertificateSchema', () => {
        it('accepts valid data', () => {
            const result = searchCertificateSchema.parse({ searchTerm: 'Juan' });
            expect(result.searchTerm).toBe('Juan');
        });

        it('rejects missing searchTerm', () => {
            expect(() => searchCertificateSchema.parse({})).toThrow();
        });
    });
});
