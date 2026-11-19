// Types para la integración con Praxys v2 - Prescripción Electrónica

export interface PraxysPaciente {
    nombre: string;
    apellido: string;
    tipoDocumento: string;
    numeroDocumento: number;
    fechaNacimiento: string;
    sexo: string;
    cuil?: number;
}

export interface PraxysCoberturaSalud {
    idObraSocial: number;
    idConvenio?: number;
    numeroAfiliado: string;
    codigoPlan?: string;
    nombrePlan?: string;
}

export interface PraxysPrescriptor {
    matricula: string;
    tipoMatricula: string;
    idProvinciaMatricula: string;
    tipoPrescriptor: string;
    cuit?: number;
}

export interface PraxysDiagnostico {
    descripcion: string;
    codigoCIE10: string;
}

export interface PraxysProducto {
    codigoAlfabeta: number;
    codigoBarras?: string;
}

export interface PraxysRenglon {
    tipoPrescripcion: string;
    producto: PraxysProducto;
    cantidadEnvases: number;
    diagnostico: PraxysDiagnostico;
    indicaciones?: string;
    observaciones?: string;
}

export interface PraxysRecetasRequest {
    cantidadRecetas: number;
    cantidadDiasEntreRecetas: number;
}

export interface PraxysPrescriptionRequest {
    paciente: PraxysPaciente;
    coberturaSalud?: PraxysCoberturaSalud;
    prescriptor: PraxysPrescriptor;
    renglones: PraxysRenglon[];
    tratamientoProlongado: boolean;
    idAtencion?: string;
    recetas?: PraxysRecetasRequest;
    fechaPrescripcion?: string;
}

export interface PraxysRecetaEmitida {
    numeroReceta?: string;
    idReceta: number;
    hash: string;
    contenidoQR?: string;
    cuirs?: Array<string | null>;
}

export interface PraxysMensaje {
    mensaje: string;
    codigo: number;
    // E=Error, A=Aviso, I=Información
    severidad: string;
}

export interface PraxysPrescriptionResponse {
    idPrescripcion: number;
    hash: string;
    recetasEmitidas?: PraxysRecetaEmitida[];
    mensajes?: PraxysMensaje[];
}

export interface PraxysErrorResponse {
    error?: string;
    mensaje?: string;
    mensajes?: PraxysMensaje[];
    detalles?: Array<{
        campo: string;
        mensaje: string;
    }>;
}

export interface PraxysAnnulmentResponse {
    anulacionExitosa?: boolean;
    mensaje?: string;
    codigo?: number;
    severidad?: string;
    recetas?: string[];
}

export interface PraxysPdfResponse {
    pdf: string;
    contentType: string;
}
