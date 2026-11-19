import { checkPraxysEligibility } from '../../../src/integrations/praxys';
import { PraxysMapper } from '../../../src/integrations/praxys';
import { IPrescription } from '../../../src/modules/prescriptions/prescription.types';
import { PraxysPrescriptionRequest } from '../../../src/integrations/praxys';
import { env } from '../../../src/config/config';

function buildPayload(overrides: Partial<PraxysPrescriptionRequest> = {}): PraxysPrescriptionRequest {
    return {
        paciente: {
            nombre: 'JUAN',
            apellido: 'PEREZ',
            tipoDocumento: 'DNI',
            numeroDocumento: 30123456,
            fechaNacimiento: '1990-01-15T00:00:00.000Z',
            sexo: 'M',
        },
        prescriptor: {
            matricula: '12345',
            tipoMatricula: 'P',
            idProvinciaMatricula: 'Q',
            tipoPrescriptor: 'M',
            cuit: 20123456786,
        },
        renglones: [{
            tipoPrescripcion: 'M',
            producto: { codigoAlfabeta: 65123456 },
            cantidadEnvases: 1,
            diagnostico: { descripcion: 'Hipertension', codigoCIE10: 'I10' },
        }],
        tratamientoProlongado: false,
        ...overrides,
    };
}

describe('checkPraxysEligibility', () => {
    it('acepta un payload completo con sexo X', () => {
        const payload = buildPayload();
        payload.paciente.sexo = 'X';
        expect(checkPraxysEligibility(payload).eligible).toBe(true);
    });

    it('rechaza paciente sin DNI', () => {
        const payload = buildPayload();
        payload.paciente.numeroDocumento = 0;
        const result = checkPraxysEligibility(payload);
        expect(result.eligible).toBe(false);
        expect(result.reason).toBe('Paciente sin DNI');
    });

    it('rechaza paciente sin fecha de nacimiento', () => {
        const payload = buildPayload();
        payload.paciente.fechaNacimiento = '';
        expect(checkPraxysEligibility(payload).eligible).toBe(false);
    });

    it('rechaza sexo no soportado', () => {
        const payload = buildPayload();
        payload.paciente.sexo = '';
        expect(checkPraxysEligibility(payload).eligible).toBe(false);
    });

    it('rechaza profesional sin matricula', () => {
        const payload = buildPayload();
        payload.prescriptor.matricula = '';
        expect(checkPraxysEligibility(payload).eligible).toBe(false);
    });

    it('rechaza profesional sin CUIT/CUIL', () => {
        const payload = buildPayload();
        payload.prescriptor.cuit = undefined;
        const result = checkPraxysEligibility(payload);
        expect(result.eligible).toBe(false);
        expect(result.reason).toBe('Profesional sin CUIT/CUIL');
    });

    it('rechaza profesion no soportada por Praxys', () => {
        const payload = buildPayload();
        payload.prescriptor.tipoPrescriptor = '';
        const result = checkPraxysEligibility(payload);
        expect(result.eligible).toBe(false);
        expect(result.reason).toBe('Profesión no soportada por Praxys');
    });

    it('rechaza producto sin codigo Alfabeta', () => {
        const payload = buildPayload();
        payload.renglones[0].producto = { codigoAlfabeta: 0 };
        expect(checkPraxysEligibility(payload).eligible).toBe(false);
    });
});

describe('PraxysMapper', () => {
    const basePrescription = {
        patient: {
            firstName: 'Ana',
            lastName: 'Perez',
            dni: '12345678',
            sex: 'Otro',
            fechaNac: new Date('1990-01-15'),
            obraSocial: { nombre: 'OSDE', numeroAfiliado: '123' },
            cuil: '20-12345678-9',
        },
        professional: {
            businessName: 'Dr. Gomez',
            cuil: '20-12345678-9',
            enrollment: '9999',
            profesionGrado: [{ profesion: 'Médico', codigoProfesion: '1', numeroMatricula: '5555' }],
        },
        supplies: [{
            supply: { name: 'Ibuprofeno', code: { source: 'ALFABETA', value: '65123456' }, barCode: '7791234567890' },
            quantity: 1,
            diagnostic: 'Dolor',
            indication: 'Cada 8 horas',
        }],
        tratamientoProlongado: 0,
    };

    function build(overrides: Record<string, unknown> = {}): IPrescription {
        return { ...basePrescription, ...overrides } as unknown as IPrescription;
    }

    it('normaliza el sexo Otro a X y usa tipoPrescripcion M', () => {
        const payload = PraxysMapper.toPraxysFromDoc(build());
        expect(payload.paciente.sexo).toBe('X');
        expect(payload.renglones[0].tipoPrescripcion).toBe('M');
        expect(payload.renglones[0].producto.codigoAlfabeta).toBe(65123456);
    });

    it('incluye el CUIL del paciente en el payload', () => {
        const payload = PraxysMapper.toPraxysFromDoc(build());
        expect(payload.paciente.cuil).toBe(20123456789);
    });

    it('prioriza numeroMatricula, mapea MEDICO a M y completa matricula/CUIT', () => {
        const payload = PraxysMapper.toPraxysFromDoc(build());
        expect(payload.prescriptor.matricula).toBe('5555');
        expect(payload.prescriptor.tipoPrescriptor).toBe('M');
        expect(payload.prescriptor.tipoMatricula).toBe(env.PRAXYS_MATRICULA_TIPO || 'P');
        expect(payload.prescriptor.idProvinciaMatricula).toBe(env.PRAXYS_MATRICULA_PROVINCIA || 'Q');
        expect(payload.prescriptor.cuit).toBe(20123456789);
    });

    it('mapea ODONTOLOGO (con o sin acento) a O', () => {
        const payload = PraxysMapper.toPraxysFromDoc(build({
            professional: {
                ...basePrescription.professional,
                profesionGrado: [{ profesion: 'Odontólogo', codigoProfesion: '2', numeroMatricula: '777' }],
            },
        }));
        expect(payload.prescriptor.tipoPrescriptor).toBe('O');
        expect(payload.prescriptor.matricula).toBe('777');
    });

    it('usa enrollment cuando no hay numeroMatricula', () => {
        const payload = PraxysMapper.toPraxysFromDoc(build({
            professional: { ...basePrescription.professional, profesionGrado: [] },
        }));
        expect(payload.prescriptor.matricula).toBe('9999');
    });
});
