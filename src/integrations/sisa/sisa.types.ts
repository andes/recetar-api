export interface SisaOrganization {
    id?: string;
    nombre: string;
    direccion?: string;
    codigo?: {
        sisa?: string;
        cuie?: string;
    };
    tipoEstablecimiento?: string;
    localidad?: string;
    provincia?: string;
    dependencia?: string;
}

export interface SisaOrganizationDetail {
    codigo: string;
    codigoSISA: string;
    nombre: string;
    provincia: string;
    localidad: string;
    depto: string;
    domicilio: {
        direccion: string;
        codigoPostal: string;
    };
    telefono: string;
    coordenadas: {
        latitud: string;
        longitud: string;
    };
    tipologia: string;
    dependencia: string;
    origenFinanciamiento: string;
    internacion: string;
    caps: string;
}
