import { readFileSync } from 'fs';
import { join } from 'path';
import { PraxisEventsMapper } from '../../../src/modules/praxis-events/praxis-events.mapper';

function loadFixture(name: string): Record<string, any> {
    return JSON.parse(readFileSync(join(__dirname, '../../fixtures/praxis', name), 'utf-8'));
}

describe('PraxisEventsMapper', () => {
    const prescripcion = loadFixture('prescripcion.json');
    const dispensa = loadFixture('dispensa.json');

    it('mapea los renglones de dispensa con el número de autorización', () => {
        const entries = PraxisEventsMapper.toDispensaEntries(dispensa);

        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({
            descripcion: 'TRIFAMOX  250 mg JBE x  120',
            cantidad: 1,
            sistema: 'praxis',
            numeroAutorizacion: '00301003244905',
        });
        expect(entries[0].fecha).toBeInstanceOf(Date);
    });

    it('mapea la metadata de la receta', () => {
        const metadata = PraxisEventsMapper.toRecetaMetadata(
            prescripcion.recetas[0],
            prescripcion.renglones,
        );

        expect(metadata.idReceta).toBe('1234567890');
        expect(metadata.numeroReceta).toBe('10015');
        expect(metadata.cuirs).toBeUndefined();
    });

    it('mapea beneficiario, profesional y obra social', () => {
        const patient = PraxisEventsMapper.toPatient(prescripcion);
        const professional = PraxisEventsMapper.toProfessional(prescripcion);
        const obraSocial = PraxisEventsMapper.toObraSocial(prescripcion);

        expect(patient).toMatchObject({
            firstName: 'JUAN',
            lastName: 'PEREZ',
            dni: '18943903',
            obraSocial: {
                nombre: 'Nombre de la obra social',
                numeroAfiliado: '1894390300',
            },
        });
        expect(professional).toMatchObject({
            businessName: 'Nombre del médico',
            enrollment: '12345',
            cuil: '20223598276',
        });
        expect(obraSocial).toEqual({ nombre: 'Nombre de la obra social', codigoRNOS: 123456 });
    });
});
