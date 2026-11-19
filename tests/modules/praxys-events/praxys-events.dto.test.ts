import { readFileSync } from 'fs';
import { join } from 'path';
import {
    praxysDispensationEventSchema,
    praxysHashParamSchema,
    praxysPrescriptionEventSchema,
} from '../../../src/modules/praxys-events/praxys-events.dto';

function loadFixture(name: string): Record<string, any> {
    return JSON.parse(readFileSync(join(__dirname, '../../fixtures/praxys', name), 'utf-8'));
}

describe('praxys-events DTOs', () => {
    const prescripcion = loadFixture('prescripcion.json');
    const dispensa = loadFixture('dispensa.json');

    it('parsea el ejemplo de prescripción y normaliza los campos vacíos', () => {
        const parsed = praxysPrescriptionEventSchema.parse(prescripcion);

        expect(parsed.hash).toBe('1234567890');
        expect(parsed.idAtencion).toBeUndefined();
        expect(parsed.recetas[0].fechaAnulacion).toBeUndefined();
        expect(parsed.renglones[0].diagnostico?.ciE10).toBeUndefined();
        expect(parsed.renglones[0].cuir).toBeUndefined();
    });

    it('acepta la variante cie10 además de ciE10', () => {
        const withCie10 = {
            ...prescripcion,
            renglones: [{
                ...prescripcion.renglones[0],
                diagnostico: { descripcion: 'Dolor', cie10: 'A00' },
            }],
        };

        const parsed = praxysPrescriptionEventSchema.parse(withCie10);

        expect(parsed.renglones[0].diagnostico?.cie10).toBe('A00');
    });

    it('rechaza hash vacío, recetas vacías y renglones vacíos', () => {
        expect(() => praxysPrescriptionEventSchema.parse({ ...prescripcion, hash: '' })).toThrow();
        expect(() => praxysPrescriptionEventSchema.parse({ ...prescripcion, recetas: [] })).toThrow();
        expect(() => praxysPrescriptionEventSchema.parse({ ...prescripcion, renglones: [] })).toThrow();
    });

    it('parsea el ejemplo de dispensa', () => {
        const parsed = praxysDispensationEventSchema.parse(dispensa);

        expect(parsed.dispensa.numeroAutorizacion).toBe('00301003244905');
        expect(parsed.dispensa.renglones[0].cantidadEnvases).toBe(1);
    });

    it('rechaza una dispensa sin número de autorización o sin renglones', () => {
        expect(() => praxysDispensationEventSchema.parse({
            ...dispensa,
            dispensa: { ...dispensa.dispensa, numeroAutorizacion: '' },
        })).toThrow();
        expect(() => praxysDispensationEventSchema.parse({
            ...dispensa,
            dispensa: { ...dispensa.dispensa, renglones: [] },
        })).toThrow();
    });

    it('valida el hash de path', () => {
        expect(praxysHashParamSchema.parse({ hash: 'a'.repeat(64) }).hash).toHaveLength(64);
        expect(() => praxysHashParamSchema.parse({ hash: '' })).toThrow();
        expect(() => praxysHashParamSchema.parse({ hash: 'a'.repeat(65) })).toThrow();
    });
});
