// Types para la integración con Praxis v2 - Prescripción Electrónica

export interface PraxisPaciente {
    nombre: string;
    apellido: string;
    tipoDocumento: string;
    numeroDocumento: number;
    fechaNacimiento: string;
    sexo: string;
    cuil?: number;
}

export interface PraxisCoberturaSalud {
    idObraSocial: number;
    idConvenio: number;
    numeroAfiliado: string;
    codigoPlan: string;
    nombrePlan: string;
}

export interface PraxisPrescriptor {
    matricula: string;
    tipoMatricula: string;
    idProvinciaMatricula: string;
    tipoPrescriptor: string;
}

export interface PraxisDiagnostico {
    descripcion: string;
    codigoCIE10: string;
}

export interface PraxisProducto {
    codigoAlfabeta: number;
    codigoBarras: string;
}

export interface PraxisRenglon {
    tipoPrescripcion: string;
    producto: PraxisProducto;
    cantidadEnvases: number;
    diagnostico: PraxisDiagnostico;
    indicaciones: string;
    observaciones?: string;
}

export interface PraxisPrescriptionRequest {
    paciente: PraxisPaciente;
    coberturaSalud?: PraxisCoberturaSalud;
    prescriptor: PraxisPrescriptor;
    renglones: PraxisRenglon[];
    tratamientoProlongado: boolean;
}

export interface PraxisPrescriptionResponse {
    idPrescripcion: string;
    estado: string;
    mensaje?: string;
}

export interface PraxisErrorResponse {
    error: string;
    mensaje: string;
    detalles?: Array<{
        campo: string;
        mensaje: string;
    }>;
}

export interface PraxisPdfResponse {
    pdf: string;
    contentType: string;
}
