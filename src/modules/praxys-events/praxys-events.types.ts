import { Document } from 'mongoose';

export type PraxysEventType =
    | 'prescripcion'
    | 'anulacion-prescripcion'
    | 'anulacion-receta'
    | 'dispensa'
    | 'anulacion-dispensa';

export type PraxysEventState = 'procesado' | 'desconocido' | 'error';

export interface PraxysEventResult {
    hash: string;
    duplicate: boolean;
    estado: PraxysEventState;
    linked: boolean;
    affected?: number;
}

export interface PraxysEventoProducto {
    descripcion?: string;
    codigoBarras?: string;
    troquel?: number;
    codigoAlfabeta?: number;
}

export interface PraxysEventoGenerico {
    drogas?: string;
    presentacion?: string;
}

export interface PraxysEventoDiagnostico {
    descripcion?: string;
    cie10?: string;
    ciE10?: string;
    codigoCIE10?: string;
}

export interface PraxysEventoRenglon {
    numeroRenglon?: number;
    tipoPrescripcion?: string;
    generico?: PraxysEventoGenerico;
    producto?: PraxysEventoProducto;
    cantidadEnvases: number;
    diagnostico?: PraxysEventoDiagnostico;
    indicaciones?: string;
    cuir?: string;
}

export interface PraxysEventoReceta {
    hash: string;
    fecha?: string;
    numero?: string;
    fechaAnulacion?: string;
    id?: number;
}

export interface PraxysEventoPrescriptor {
    nombre?: string;
    matricula?: string;
    tipoMatricula?: string;
    idProvinciaMatricula?: string;
    cuit?: string;
    idOrganizacion?: number;
}

export interface PraxysEventoObraSocial {
    nombre?: string;
    codigoRNOS?: number;
}

export interface PraxysEventoBeneficiario {
    numero?: string;
    nombre?: string;
    tipoDocumento?: string;
    numeroDocumento?: number;
    correo?: string;
    celular?: string;
    cuil?: number;
}

export interface PraxysEventoPrescripcion {
    id?: number;
    hash: string;
    fecha?: string;
    idAtencion?: string;
    prescriptor?: PraxysEventoPrescriptor;
    obraSocial?: PraxysEventoObraSocial;
    beneficiario?: PraxysEventoBeneficiario;
    tratamientoProlongado?: boolean;
    recetas?: PraxysEventoReceta[];
    renglones?: PraxysEventoRenglon[];
}

export interface PraxysEventoDispensa {
    fecha?: string;
    beneficiario?: { numero?: string };
    receta?: { fecha?: string; numero?: string };
    dispensa: {
        numeroAutorizacion: string;
        renglones: Array<{
            producto?: PraxysEventoProducto;
            cantidadEnvases: number;
        }>;
    };
}

export interface IPraxysEvent extends Document {
    claveIdempotencia: string;
    tipo: PraxysEventType;
    hash: string;
    recetaHash?: string;
    numeroAutorizacion?: string;
    payload?: Record<string, unknown>;
    recibidoEn: Date;
    estado: PraxysEventState;
    prescriptionId?: string;
    createdAt: Date;
    updatedAt: Date;
}
