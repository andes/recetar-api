import { Document } from 'mongoose';

export type PraxisEventType =
    | 'prescripcion'
    | 'anulacion-prescripcion'
    | 'anulacion-receta'
    | 'dispensa'
    | 'anulacion-dispensa';

export type PraxisEventState = 'procesado' | 'desconocido' | 'error';

export interface PraxisEventResult {
    hash: string;
    duplicate: boolean;
    estado: PraxisEventState;
    linked: boolean;
    affected?: number;
}

export interface PraxisEventoProducto {
    descripcion?: string;
    codigoBarras?: string;
    troquel?: number;
    codigoAlfabeta?: number;
}

export interface PraxisEventoGenerico {
    drogas?: string;
    presentacion?: string;
}

export interface PraxisEventoDiagnostico {
    descripcion?: string;
    cie10?: string;
    ciE10?: string;
    codigoCIE10?: string;
}

export interface PraxisEventoRenglon {
    numeroRenglon?: number;
    tipoPrescripcion?: string;
    generico?: PraxisEventoGenerico;
    producto?: PraxisEventoProducto;
    cantidadEnvases: number;
    diagnostico?: PraxisEventoDiagnostico;
    indicaciones?: string;
    cuir?: string;
}

export interface PraxisEventoReceta {
    hash: string;
    fecha?: string;
    numero?: string;
    fechaAnulacion?: string;
    id?: number;
}

export interface PraxisEventoPrescriptor {
    nombre?: string;
    matricula?: string;
    tipoMatricula?: string;
    idProvinciaMatricula?: string;
    cuit?: string;
    idOrganizacion?: number;
}

export interface PraxisEventoObraSocial {
    nombre?: string;
    codigoRNOS?: number;
}

export interface PraxisEventoBeneficiario {
    numero?: string;
    nombre?: string;
    tipoDocumento?: string;
    numeroDocumento?: number;
    correo?: string;
    celular?: string;
    cuil?: number;
}

export interface PraxisEventoPrescripcion {
    id?: number;
    hash: string;
    fecha?: string;
    idAtencion?: string;
    prescriptor?: PraxisEventoPrescriptor;
    obraSocial?: PraxisEventoObraSocial;
    beneficiario?: PraxisEventoBeneficiario;
    tratamientoProlongado?: boolean;
    recetas?: PraxisEventoReceta[];
    renglones?: PraxisEventoRenglon[];
}

export interface PraxisEventoDispensa {
    fecha?: string;
    beneficiario?: { numero?: string };
    receta?: { fecha?: string; numero?: string };
    dispensa: {
        numeroAutorizacion: string;
        renglones: Array<{
            producto?: PraxisEventoProducto;
            cantidadEnvases: number;
        }>;
    };
}

export interface IPraxisEvent extends Document {
    claveIdempotencia: string;
    tipo: PraxisEventType;
    hash: string;
    recetaHash?: string;
    numeroAutorizacion?: string;
    payload?: Record<string, unknown>;
    recibidoEn: Date;
    estado: PraxisEventState;
    prescriptionId?: string;
    createdAt: Date;
    updatedAt: Date;
}
