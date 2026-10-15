import {
    createPatientSchema,
    updatePatientSchema,
    searchPatientsSchema,
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

        it('accepts dni and sex only (RENAPER completa el resto)', () => {
            const result = createPatientSchema.parse({ dni: '12345678', sex: 'Masculino' });
            expect(result.dni).toBe('12345678');
            expect(result.sex).toBe('Masculino');
            expect(result.firstName).toBeUndefined();
        });

        it('accepts a patient without dni when firstName and lastName are present', () => {
            const result = createPatientSchema.parse({
                firstName: 'Ana',
                lastName: 'Gómez',
                sex: 'Femenino',
            });
            expect(result.dni).toBeUndefined();
            expect(result.firstName).toBe('Ana');
        });

        it('accepts an empty dni when firstName and lastName are present', () => {
            const result = createPatientSchema.parse({
                dni: '',
                firstName: 'Ana',
                lastName: 'Gómez',
                sex: 'Femenino',
            });
            expect(result.dni).toBe('');
        });

        it('rejects a patient without dni and without firstName/lastName', () => {
            expect(() => createPatientSchema.parse({ sex: 'Femenino' })).toThrow();
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

        it('ignores empty or Ninguno gender', () => {
            expect(createPatientSchema.parse({ ...validData, genero: '' }).genero).toBeUndefined();
            expect(createPatientSchema.parse({ ...validData, genero: 'Ninguno' }).genero).toBeUndefined();
        });

        it('rejects missing sex', () => {
            expect(() => createPatientSchema.parse({ ...validData, sex: undefined })).toThrow();
        });

        it('rejects missing dni', () => {
            expect(() => createPatientSchema.parse({ sex: 'Masculino' })).toThrow();
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

        it('accepts contactos and direcciones', () => {
            const result = createPatientSchema.parse({
                ...validData,
                contactos: [{ tipo: 'celular', valor: '2994000000' }],
                direcciones: [{ calle: 'San Martín 123' }],
            });
            expect(result.contactos?.[0].tipo).toBe('celular');
            expect(result.direcciones?.[0].calle).toBe('San Martín 123');
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

        it('accepts an empty dni for an update', () => {
            const result = updatePatientSchema.parse({ dni: '' });
            expect(result.dni).toBe('');
        });

        it('ignores empty or Ninguno gender', () => {
            expect(updatePatientSchema.parse({ genero: '' }).genero).toBeUndefined();
            expect(updatePatientSchema.parse({ genero: 'Ninguno' }).genero).toBeUndefined();
        });

        it('accepts contactos and direcciones', () => {
            const result = updatePatientSchema.parse({
                contactos: [{ tipo: 'email', valor: 'ana@example.com' }],
                direcciones: [{ calle: 'San Martín 123', localidad: 'Neuquén', provincia: 'Neuquén' }],
            });
            expect(result.contactos).toHaveLength(1);
            expect(result.direcciones?.[0].calle).toBe('San Martín 123');
        });
    });

    describe('searchPatientsSchema', () => {
        it('accepts filters and pagination', () => {
            const result = searchPatientsSchema.parse({
                q: 'Ana',
                estado: 'temporal',
                sexo: 'femenino',
                email: 'ana@example.com',
                offset: '10',
                limit: '20',
            });
            expect(result.offset).toBe(10);
            expect(result.limit).toBe(20);
            expect(result.estado).toBe('temporal');
        });

        it('uses defaults for offset and limit', () => {
            const result = searchPatientsSchema.parse({});
            expect(result.offset).toBe(0);
            expect(result.limit).toBe(20);
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
