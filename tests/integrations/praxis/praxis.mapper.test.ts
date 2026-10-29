import { PraxisMapper } from '../../../src/integrations/praxis';
import { IPrescription } from '../../../src/modules/prescriptions/prescription.types';

function buildPrescription(overrides: Record<string, unknown> = {}): IPrescription {
    return {
        prescriptionId: 'P-1',
        patient: {
            firstName: 'Juan',
            lastName: 'Pérez',
            dni: '12345678',
            sex: 'M',
            obraSocial: { nombre: 'OSDE', numeroAfiliado: 'A-1' },
        },
        professional: {
            businessName: 'Dr. Gómez',
            enrollment: '12345',
            profesionGrado: [{ codigoProfesion: 'N', numeroMatricula: '12345' }],
        },
        supplies: [{
            supply: {
                name: 'Ibuprofeno 400mg',
                code: { source: 'ALFABETA', value: '65123456' },
                barCode: '7891234567890',
            },
            quantity: 1,
            diagnostic: 'Dolor',
            indication: 'Cada 8 horas',
        }],
        status: 'Pendiente',
        date: new Date(),
        ...overrides,
    } as unknown as IPrescription;
}

describe('PraxisMapper', () => {
    it('envía idAtencion y la cantidad de recetas de un tratamiento prolongado', () => {
        const payload = PraxisMapper.toPraxisFromDoc(buildPrescription({
            treatmentGroupId: 'TG-1',
            tratamientoProlongado: 3,
        }));

        expect(payload.idAtencion).toBe('TG-1');
        expect(payload.tratamientoProlongado).toBe(true);
        expect(payload.recetas).toEqual({ cantidadRecetas: 3, cantidadDiasEntreRecetas: 30 });
        expect(payload.renglones).toHaveLength(1);
        expect(payload.renglones[0].producto.codigoAlfabeta).toBe(65123456);
    });

    it('usa el prescriptionId como idAtencion en una receta simple', () => {
        const payload = PraxisMapper.toPraxisFromDoc(buildPrescription());

        expect(payload.idAtencion).toBe('P-1');
        expect(payload.tratamientoProlongado).toBe(false);
        expect(payload.recetas).toBeUndefined();
    });
});
