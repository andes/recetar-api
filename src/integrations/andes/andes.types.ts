export interface AndesSnomedConcept {
    conceptId: string;
    term: string;
    fsn?: string;
    semanticTag?: string;
}

export interface AndesProfessional {
    id: string;
    nombre: string;
    apellido: string;
    documento: string;
    profesion: string;
    especialidad: string;
    matricula: string;
}

export interface AndesPatient {
    id: string;
    nombre: string;
    apellido: string;
    documento: string;
    sexo: string;
    fechaNacimiento: string;
    obraSocial?: {
        nombre: string;
        numeroAfiliado?: string;
    };
    genero?: string;
    nombreCompleto?: string;
    edad?: number;
    cuil?: string;
}

export interface AndesOrganization {
    id?: string;
    nombre: string;
}

export interface AndesDispense {
    descripcion: string;
    cantidad: number;
    medicamento: AndesSnomedConcept;
    presentacion: string;
    unidades: string;
    cantidadEnvases: number;
    organizacion: AndesOrganization;
}

export interface AndesPrescriptionState {
    tipo: 'pendiente' | 'vigente' | 'finalizada' | 'vencida' | 'suspendida' | 'rechazada';
    createdAt: string;
    createdBy: {
        nombre: string;
        apellido: string;
        organizacion: AndesOrganization;
    };
}

export interface AndesPrescription {
    _id: string;
    idAndes?: string;
    organizacion: AndesOrganization;
    profesional: AndesProfessional;
    diagnostico?: AndesSnomedConcept;
    fechaRegistro: string;
    fechaPrestacion: string;
    idPrestacion: string;
    idRegistro: string;
    medicamento?: {
        concepto: AndesSnomedConcept;
        dosisDiaria?: {
            dosis: string;
            instervalo?: { id: string; key: string; nombre: string };
            dias: number;
            notaMedica?: string;
        };
        presentacion: string;
        unidades: string;
        cantidad: number;
        cantEnvases: number;
        tratamientoProlongado?: boolean;
        tiempoTratamiento?: unknown;
    };
    insumo?: {
        concepto?: AndesSnomedConcept;
        generico?: { id: string; nombre: string };
        cantidad: number;
        especificacion: string;
        diagnostico: string;
    };
    dispensa: AndesDispense[];
    estados: AndesPrescriptionState[];
    estadoActual: AndesPrescriptionState;
    paciente: AndesPatient;
    createdAt: string;
    updatedAt: string;
}

export interface GetPrescriptionsByPatientParams {
    documento: string;
    sexo?: string;
    estado?: string;
}

export interface GetPrescriptionsByProfessionalParams {
    professionalId: string;
    estadoReceta?: string;
    desde?: string;
    hasta?: string;
}

export interface GetPrescriptionsByDniParams {
    dni: string;
    sexo: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface AndesInsumoPayload {
    organizacion: AndesOrganization;
    profesional: {
        id: string;
        nombre: string;
        apellido: string;
        documento: string;
        profesion: string;
        matricula: string;
        especialidad: string;
    };
    fechaRegistro: string;
    fechaPrestacion: string;
    idPrestacion: string;
    idRegistro: string;
    diagnostico: string;
    insumo: {
        concepto?: AndesSnomedConcept;
        generico?: { id: string; nombre: string };
        cantidad: number;
        especificacion: string;
        diagnostico: string;
    };
    paciente: {
        id: string;
        nombre: string;
        apellido: string;
        documento: string;
        sexo: string;
        fechaNacimiento?: string;
        obraSocial?: { nombre: string; numeroAfiliado?: string };
    };
    origenExterno: {
        id: string;
        app: { nombre: string };
        fecha: string;
    };
}

export interface AndesMedicamentoPayload {
    organizacion: AndesOrganization;
    profesional: {
        id: string;
        nombre: string;
        apellido: string;
        documento: string;
        profesion: string;
        matricula: string;
        especialidad: string;
    };
    paciente: {
        id: string;
        nombre: string;
        apellido: string;
        documento: string;
        sexo: string;
        fechaNacimiento?: string;
        obraSocial?: { nombre: string; numeroAfiliado?: string };
    };
    idPrestacion: string;
    idRegistro: string;
    fechaRegistro: string;
    diagnostico: string;
    medicamento: {
        diagnostico: string;
        concepto?: AndesSnomedConcept;
        presentacion: string;
        unidades: string;
        cantidad: number;
        cantEnvases: number;
        dosisDiaria: {
            dosis: string | null;
            dias: number | null;
            notaMedica?: string;
        };
        tratamientoProlongado: boolean;
        tiempoTratamiento: { id: string; nombre: string } | null;
        tipoReceta: 'triplicado' | 'duplicado' | 'simple';
        serie: string;
        numero: string;
    };
    origenExterno: {
        id: string;
        nombre: string;
        fecha: string;
    };
}

export interface AndesPatientPayload {
    nombre: string;
    apellido: string;
    documento: string;
    sexo: string;
    genero: string;
    fechaNacimiento?: Date;
    estado: string;
    alias?: string;
}

export interface AndesSuspendPayload {
    op: 'suspender';
    recetaId: string;
    motivo: string;
    observacion?: string;
    profesional?: {
        id: string;
        nombre: string;
        apellido: string;
    };
    fecha: string;
}

export interface AndesStockItem {
    _id: string;
    nombre: string;
    tipo?: string;
    cantidad?: number;
    [key: string]: unknown;
}

export interface AndesMPIPatient {
    id: string;
    documento: string;
    nombre: string;
    apellido: string;
    sexo: string;
    genero?: string;
    fechaNacimiento?: string;
    estado: string;
    alias?: string;
    cuil?: string;
    tipoIdentificacion?: string;
    numeroIdentificacion?: string;
    identificadores?: Array<{ entidad: string; valor: string }>;
}

export interface AndesCoverage {
    nombre: string;
    financiador?: string;
    codigoPuco?: number;
    idObraSocial?: number;
    prepaga?: boolean;
}
