export interface EvwebConfig {
    endpoint: string;
    username: string;
    password: string;
    provincia: string;
}

// Auth

export interface EvwebLoginRequest {
    username: string;
    password: string;
}

export interface EvwebLoginResponse {
    exp: string;
    jwt: string;
}

// CIE-10

export interface EvwebCIE10 {
    Codigo: string;
    Descripcion: string;
}

// Medicamentos (AlphaBeta)

export interface EvwebMedicamento {
    ID: number;
    Nombre: string;
    Presentacion: string;
    Monodroga: string;
    Laboratorio: string;
    Vademecum: string;
}

// Obras Sociales

export interface EvwebObraSocial {
    id: number;
    active: boolean;
    createdAt: string;
    nombre: string;
    codigoHomologador: string;
    serviceKey: string;
}

// Recetas — Request para crear

export interface EvwebMedicamentoReceta {
    CodAlfabeta?: number;
    Cantidad: number;
    EsSugerido?: boolean;
    // Si no se tiene CodAlfabeta, se envía datos manualmente
    Nombre?: string;
    Laboratorio?: string;
    Presentacion?: string;
    Monodroga?: string;
}

export interface EvwebRecetaRequest {
    MD_CUIT: number;
    PC_CUIL?: string;
    PC_DNI: number;
    PC_NroAfiliado?: string;
    PC_OS_Prepaga?: string;
    PC_OS_CUIT?: string;
    MD_Matricula: string;
    MD_Sello_Matricula?: string;
    FechaReceta: string;
    MD_Nombre: string;
    MD_Profesion: string;
    MD_Especialidad: string;
    MD_Domicilio?: string;
    MD_UrlFirma?: string;
    PC_Nombre: string;
    PC_Email?: string;
    PC_FechaNacimiento: string;
    PC_Sexo: string;
    PC_TipoDocumento?: number;
    PC_Telefono?: string;
    Indicaciones?: string;
    Medicamentos: EvwebMedicamentoReceta[];
    Diagnostico?: string;
    DiagnosticoCodigo?: string;
    MD_Sello_Nombre?: string;
    MD_Sello_Especialidad?: string;
    MD_Codigo_Especialidad?: string;
    MD_Emisor_Matricula?: string;
    MD_Tipo_Matricula?: string;
    ProvinciaAsociacion?: string;
    Tratamiento_Prolongado?: boolean;
    Solicitante?: string;
    EsLey27675?: boolean;
}

// Recetas — Response

export interface EvwebMedicamentoResponse {
    ID: number;
    Nombre: string;
    Presentacion: string;
    Monodroga: string;
    Laboratorio: string;
    Vademecum: string;
}

export interface EvwebDiagnosticoCIE10 {
    Codigo: string;
    Descripcion: string;
}

export interface EvwebRecetaResponse {
    ID: string;
    CUIR: string;
    CodigoReferencia: number;
    FechaCreacion: string;
    FechaReceta: string;
    Solicitante: string;
    MD_Nombre: string;
    MD_CUIT: number;
    MD_Matricula: string;
    MD_Profesion: string;
    MD_Especialidad: string;
    MD_Domicilio: string;
    MD_UrlFirma: string;
    PC_Nombre: string;
    PC_OS_Prepaga: string;
    PC_NroAfiliado: string;
    PC_FechaNacimiento: string;
    PC_DNI: number;
    PC_Sexo: string;
    Indicaciones: string;
    Medicamentos: EvwebMedicamentoResponse[];
    DiagnosticosCIE10: EvwebDiagnosticoCIE10[];
    DescripcionDiagnostico: string;
    DescripcionMedicamentos: string | null;
    PC_Email: string;
    MD_Sello_Nombre: string | null;
    MD_Sello_Especialidad: string | null;
    MD_Sello_Matricula: string | null;
    Asociacion: string | null;
    ResourceUrl: string;
    PdfUrl: string;
}

// Respuesta simplified de POST /api/recetas

export interface EvwebRecetaCreateResponse {
    id: string;
    codigoReferencia: number;
    fecha_Creacion: string;
    fechaReceta: string;
    estado: string;
    resourceUrl: string;
    pdfUrl: string;
}

// Prescripciones (estudios/prácticas)

export interface EvwebMedicoPrescripcion {
    Nombre: string;
    CUIT: number;
    Matricula: string;
    Profesion: string;
    Especialidad: string;
    Domicilio?: string;
    UrlFirma?: string;
    Sello?: {
        Nombre: string;
        Especialidad: string;
        Matricula: string;
    };
}

export interface EvwebPacientePrescripcion {
    Nombre: string;
    Email?: string;
    ObraSocial_Prepaga?: string;
    NumeroAfiliado?: string;
    FechaNacimiento: string;
    DNI: number;
    Sexo: string;
}

export interface EvwebEstudio {
    Codigo: string;
    Descripcion: string;
}

export interface EvwebDiagnosticoPrescripcion {
    ListaCodigosId: string[];
    Descripcion: string;
}

export interface EvwebPrescripcionRequest {
    FechaReceta: string;
    Medico: EvwebMedicoPrescripcion;
    Paciente: EvwebPacientePrescripcion;
    ListaEstudios: EvwebEstudio[];
    Diagnostico: EvwebDiagnosticoPrescripcion;
    Asociacion?: string;
}

export interface EvwebPrescripcionResponse {
    id: string;
    fechaReceta: string;
    medico: EvwebMedicoPrescripcion;
    paciente: EvwebPacientePrescripcion;
    listaEstudios: EvwebEstudio[];
    diagnostico: EvwebDiagnosticoPrescripcion;
}

// Validador — Quemar receta

export interface EvwebMedicamentoQuemar {
    NroAutorizacion?: string;
    CodAlfabeta: number;
    Cantidad: number;
}

export interface EvwebQuemarRequest {
    NumeroReceta: number;
    Medicamentos: EvwebMedicamentoQuemar[];
}

export interface EvwebMedicamentoQuemadoResponse {
    codAlfabeta: number;
    nombre: string;
    cantidad: number;
    exitoso: boolean;
    error: string | null;
}

export interface EvwebQuemarResponse {
    numeroReceta: number;
    nroAutorizacion: string;
    estadoReceta: string;
    totalMedicamentos: number;
    medicamentos: EvwebMedicamentoQuemadoResponse[];
    resumen: string;
}

// Validador — Búsqueda de recetas

export interface EvwebValidadorAfiliado {
    idAfiliado: string;
    nombre: string;
    apellido: string;
    estado: string;
    nroAfiliado: string;
    plan: string | null;
    obraSocial: string;
}

export interface EvwebValidadorProfesional {
    nombre: string;
    apellido: string;
    matricula: {
        tipoMatricula: string;
        numeroMatricula: string;
    };
}

export interface EvwebValidadorMedicamento {
    codAlfabeta: number;
    nombreComercial: string;
    monodroga: string;
    presentacion: string;
    cantidad: number;
}

export interface EvwebValidadorReceta {
    numeroReceta: number;
    profesional: EvwebValidadorProfesional;
    fechaEmision: string;
    medicamentos: EvwebValidadorMedicamento[];
}

export interface EvwebBusquedaRecetaResponse {
    afiliado: EvwebValidadorAfiliado;
    receta: EvwebValidadorReceta;
}

// Anular receta

export interface EvwebAnularRequest {
    Motivo: string;
}
