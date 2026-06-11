import { SisaMapper } from '../../../src/integrations/sisa/sisa.mapper';
import { SisaOrganization, SisaOrganizationDetail } from '../../../src/integrations/sisa/sisa.types';

function buildDetail(overrides: Partial<SisaOrganizationDetail> = {}): SisaOrganizationDetail {
    return {
        codigo: '123456',
        codigoSISA: '123456',
        nombre: 'Hospital Provincial',
        provincia: 'Buenos Aires',
        localidad: 'La Plata',
        depto: 'La Plata',
        domicilio: { direccion: 'Calle 1', codigoPostal: '1900' },
        telefono: '221-1234567',
        coordenadas: { latitud: '-34.9', longitud: '-57.9' },
        tipologia: 'Hospital',
        dependencia: 'Provincial',
        origenFinanciamiento: '',
        internacion: 'Sí',
        caps: '',
        ...overrides,
    };
}

describe('SisaMapper.deriveAmbito', () => {
    it('returns publico for state hints', () => {
        expect(SisaMapper.deriveAmbito('Provincial')).toBe('publico');
        expect(SisaMapper.deriveAmbito('Nacional')).toBe('publico');
        expect(SisaMapper.deriveAmbito('Municipal')).toBe('publico');
        expect(SisaMapper.deriveAmbito('Estatal')).toBe('publico');
    });

    it('returns privado for private hints', () => {
        expect(SisaMapper.deriveAmbito('Privado')).toBe('privado');
        expect(SisaMapper.deriveAmbito('Obra Social')).toBe('privado');
    });

    it('defaults to privado for missing or unknown values', () => {
        expect(SisaMapper.deriveAmbito()).toBe('privado');
        expect(SisaMapper.deriveAmbito(undefined, '')).toBe('privado');
        expect(SisaMapper.deriveAmbito('Desconocido')).toBe('privado');
    });

    it('prioritizes private hints over public hints', () => {
        expect(SisaMapper.deriveAmbito('Provincial privado')).toBe('privado');
    });
});

describe('SisaMapper.detailToSubOrganization', () => {
    it('maps ambito from the detail dependencia', () => {
        const result = SisaMapper.detailToSubOrganization(buildDetail({ dependencia: 'Provincial' }));
        expect(result.ambito).toBe('publico');
        expect(result._id).toBe('123456');
        expect(result.nombre).toBe('Hospital Provincial');
    });

    it('maps ambito privado for private establishments', () => {
        const result = SisaMapper.detailToSubOrganization(buildDetail({ dependencia: 'Privado', origenFinanciamiento: '' }));
        expect(result.ambito).toBe('privado');
    });
});

describe('SisaMapper.toAppOrganization', () => {
    it('includes the derived ambito', () => {
        const sisaOrg: SisaOrganization = {
            id: 'org-1',
            nombre: 'Hospital Municipal',
            dependencia: 'Municipal',
            tipoEstablecimiento: 'Hospital',
        };
        const result = SisaMapper.toAppOrganization(sisaOrg);
        expect(result.ambito).toBe('publico');
        expect(result._id).toBe('org-1');
    });

    it('defaults to privado without a public hint', () => {
        const sisaOrg: SisaOrganization = {
            id: 'org-2',
            nombre: 'Clínica',
            tipoEstablecimiento: 'Sanatorio',
        };
        expect(SisaMapper.toAppOrganization(sisaOrg).ambito).toBe('privado');
    });
});
