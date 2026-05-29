import {
    createPatientSchema,
    updatePatientSchema,
    getByDniSchema,
    getCoverageSchema,
} from '../../../src/modules/patients/patients.dto';

describe('Patients DTOs', () => {
    describe('createPatientSchema', () => {
        const validData = {
            dni: '12345678',
            firstName: 'Juan',
            lastName: 'Pérez',
            sex: 'Masculino' as const,
        };

        it('accepts valid data', () => {
            const result = createPatientSchema.parse(validData);
            expect(result.dni).toBe('12345678');
            expect(result.firstName).toBe('Juan');
            expect(result.lastName).toBe('Pérez');
            expect(result.sex).toBe('Masculino');
        });

        it('accepts optional fields', () => {
            const data = {
                ...validData,
                fechaNac: '1990-01-15',
                nombreAutopercibido: 'Juancito',
                genero: 'masculino',
                cuil: '20-12345678-9',
            };
            const result = createPatientSchema.parse(data);
            expect(result.fechaNac).toBe('1990-01-15');
            expect(result.nombreAutopercibido).toBe('Juancito');
            expect(result.genero).toBe('masculino');
            expect(result.cuil).toBe('20-12345678-9');
        });

        it('rejects missing firstName', () => {
            expect(() => createPatientSchema.parse({ ...validData, firstName: '' })).toThrow();
        });

        it('rejects missing lastName', () => {
            expect(() => createPatientSchema.parse({ ...validData, lastName: '' })).toThrow();
        });

        it('rejects missing sex', () => {
            expect(() => createPatientSchema.parse({ ...validData, sex: undefined })).toThrow();
        });

        it('rejects invalid sex', () => {
            expect(() => createPatientSchema.parse({ ...validData, sex: 'Invalido' })).toThrow();
        });

        it('rejects dni shorter than 6 chars', () => {
            expect(() => createPatientSchema.parse({ ...validData, dni: '12345' })).toThrow();
        });

        it('rejects dni longer than 11 chars', () => {
            expect(() => createPatientSchema.parse({ ...validData, dni: '123456789012' })).toThrow();
        });

        it('accepts empty body only for missing optional fields', () => {
            expect(() => createPatientSchema.parse({})).toThrow();
        });
    });

    describe('updatePatientSchema', () => {
        it('accepts partial data', () => {
            const result = updatePatientSchema.parse({ firstName: 'Carlos' });
            expect(result.firstName).toBe('Carlos');
        });

        it('accepts empty object (all optional)', () => {
            const result = updatePatientSchema.parse({});
            expect(result).toEqual({});
        });

        it('rejects invalid sex', () => {
            expect(() => updatePatientSchema.parse({ sex: 'OtroInvalido' })).toThrow();
        });

        it('rejects invalid dni', () => {
            expect(() => updatePatientSchema.parse({ dni: '12' })).toThrow();
        });
    });

    describe('getByDniSchema', () => {
        it('accepts valid dni', () => {
            const result = getByDniSchema.parse({ dni: '12345678' });
            expect(result.dni).toBe('12345678');
        });

        it('rejects empty dni', () => {
            expect(() => getByDniSchema.parse({ dni: '' })).toThrow();
        });
    });

    describe('getCoverageSchema', () => {
        it('accepts valid data', () => {
            const result = getCoverageSchema.parse({ dni: '12345678', sexo: 'femenino' });
            expect(result.dni).toBe('12345678');
            expect(result.sexo).toBe('femenino');
        });

        it('rejects empty dni', () => {
            expect(() => getCoverageSchema.parse({ dni: '', sexo: 'femenino' })).toThrow();
        });

        it('rejects empty sexo', () => {
            expect(() => getCoverageSchema.parse({ dni: '12345678', sexo: '' })).toThrow();
        });
    });
});
