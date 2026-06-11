import { SisaOrganization, SisaOrganizationDetail } from './sisa.types';

interface SisaEstablecimiento {
    codigo: string;
    nombre: string;
    provincia: string;
    dependencia: string;
    tipologia: string;
    localidad?: string;
}

interface SisaSearchResponse {
    resultado: string;
    establecimientos?: SisaEstablecimiento[];
    cantidadDeResultados?: number;
}

export class SisaMapper {
    static parseResponse(data: SisaSearchResponse): SisaOrganization[] {
        if (!data?.establecimientos || data.resultado === 'SIN_RESULTADOS') {
            return [];
        }
        return data.establecimientos.map((item) => ({
            id: item.codigo || '',
            nombre: item.nombre || '',
            direccion: '',
            provincia: item.provincia || '',
            localidad: item.localidad || '',
            tipoEstablecimiento: item.tipologia || '',
            dependencia: item.dependencia || '',
            codigo: {
                sisa: item.codigo || '',
                cuie: '',
            },
        }));
    }

    static parseDetailResponse(data: any): SisaOrganizationDetail | null {
        if (!data || data.resultado !== 'OK') {
            return null;
        }
        return {
            codigo: data.codigo || '',
            codigoSISA: String(data.codigoSISA || ''),
            nombre: data.nombre || '',
            provincia: data.provincia || '',
            localidad: data.localidad || '',
            depto: data.depto || '',
            domicilio: {
                direccion: data.domicilio?.direccion || '',
                codigoPostal: data.domicilio?.codigoPostal || '',
            },
            telefono: data.telefono1?.numero || '',
            coordenadas: {
                latitud: data.coordenadasDeMapa?.latitud || '',
                longitud: data.coordenadasDeMapa?.longitud || '',
            },
            tipologia: data.tipologia || '',
            dependencia: data.dependencia || '',
            origenFinanciamiento: data.origenFinanciamiento || '',
            internacion: data.internacion || '',
            caps: data.caps || '',
        };
    }

    static toAppOrganization(sisaOrg: SisaOrganization) {
        return {
            _id: sisaOrg.id || '',
            nombre: sisaOrg.nombre,
            direccion: {
                valor: sisaOrg.direccion || '',
                ubicacion: {
                    provincia: { nombre: sisaOrg.provincia || '' },
                    localidad: { nombre: sisaOrg.localidad || '' },
                },
            },
            codigo: {
                sisa: sisaOrg.codigo?.sisa || '',
                cuie: sisaOrg.codigo?.cuie || '',
            },
            tipoEstablecimiento: {
                nombre: sisaOrg.tipoEstablecimiento || '',
            },
            id: sisaOrg.id || '',
        };
    }

    static toAppOrganizationList(sisaOrgs: SisaOrganization[]) {
        return sisaOrgs.map(org => SisaMapper.toAppOrganization(org));
    }

    static detailToAppOrganization(detail: SisaOrganizationDetail) {
        return {
            _id: detail.codigo || '',
            nombre: detail.nombre,
            direccion: {
                valor: detail.domicilio.direccion || '',
                ubicacion: {
                    provincia: { nombre: detail.provincia || '' },
                    localidad: { nombre: detail.localidad || '' },
                },
            },
            codigo: {
                sisa: detail.codigo || '',
                cuie: '',
            },
            tipoEstablecimiento: {
                nombre: detail.tipologia || '',
            },
            telefono: detail.telefono || '',
            id: detail.codigo || '',
        };
    }

    static detailToSubOrganization(detail: SisaOrganizationDetail) {
        return {
            _id: detail.codigo || '',
            nombre: detail.nombre,
            direccion: detail.domicilio.direccion || '',
            provincia: detail.provincia || '',
        };
    }
}
