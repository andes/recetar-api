import { Document } from 'mongoose';

export const PRESCRIPTION_SEARCH_LIMIT = 50;

export interface PrescriptionDispenser {
    _id?: string;
    businessName?: string;
    cuil?: string;
    username?: string;
    email?: string;
}

export interface IPrescriptionSupply {
    supply: {
        name?: string;
        activePrinciple?: string;
        pharmaceutical_form?: string;
        power?: string;
        unity?: string;
        firstPresentation?: string;
        secondPresentation?: string;
        code?: { source?: 'SIFAHO' | 'SNOMED' | 'ALFABETA' | 'ANDES'; value?: string };
        type?: 'device' | 'nutrition' | 'magistral';
        requiresSpecification?: boolean;
        specification?: string;
        barCode?: string;
    };
    quantity?: number;
    quantityPresentation?: number;
    diagnostic?: string;
    indication?: string;
    duplicate?: boolean;
    triplicate?: boolean;
    triplicateData?: { serie?: string; numero?: number };
    obraSocial?: { nombre?: string; codigoPuco?: number; numeroAfiliado?: string };
}

export interface ReplacedMedication {
    name?: string;
    quantity?: number;
    supply?: IPrescriptionSupply['supply'];
}

export type ExternalIdentifierEntity = 'praxis' | 'praxis-receta' | 'prestacion' | 'registro';

export interface IExternalIdentifier {
    entidad: ExternalIdentifierEntity;
    valor: string;
}

export type ExternalSyncStatus = 'pendiente' | 'ok' | 'no_aplicable' | 'error';

export interface IExternalSyncEntity {
    estado: ExternalSyncStatus;
    intentos: number;
    ultimoError?: string;
    idPrescripcion?: string;
    idAtencion?: string;
    idReceta?: string;
    numeroReceta?: string;
    cuirs?: string[];
    contenidoQR?: string;
    observacion?: string;
}

export interface IExternalSync {
    praxis?: IExternalSyncEntity;
}

export type PrescriptionStatus = 'Pendiente' | 'Dispensada' | 'Vencida' | 'Suspendida' | 'Rechazada';

export interface IPrescriptionEstado {
    tipo: string;
    fecha?: Date;
    motivo?: string;
    observacion?: string;
}

export interface IPrescriptionDispensa {
    descripcion?: string;
    cantidad?: number;
    organizacion?: { id?: string; nombre?: string };
    fecha?: Date;
    sistema?: string;
    numeroAutorizacion?: string;
}

export interface IPrescriptionEstadoDispensa {
    tipo: 'sin-dispensa' | 'dispensada' | 'dispensa-parcial';
    fecha?: Date;
    sistema?: string;
    idDispensaApp?: string;
    numeroAutorizacion?: string;
    cancelada?: { motivo?: string; fecha?: Date };
}

export interface IPrescription extends Document {
    prescriptionId?: string;
    patient: {
        firstName: string;
        lastName: string;
        dni: string;
        sex: string;
        obraSocial?: { nombre?: string; codigoPuco?: number; numeroAfiliado?: string };
        fechaNac?: Date;
        idMPI?: string;
    };
    professional: {
        userId?: string;
        businessName?: string;
        cuil?: string;
        enrollment?: string;
        profesionGrado?: Array<{ profesion?: string; codigoProfesion?: string; numeroMatricula?: string }>;
    };
    dispensedBy?: {
        userId?: string;
        businessName?: string;
        cuil?: string;
    };
    dispensedAt?: Date;
    replacedMedication?: ReplacedMedication;
    supplies: IPrescriptionSupply[];
    status: PrescriptionStatus;
    estados?: IPrescriptionEstado[];
    estadoActual?: IPrescriptionEstado;
    estadosDispensa?: IPrescriptionEstadoDispensa[];
    estadoDispensaActual?: IPrescriptionEstadoDispensa;
    dispensa?: IPrescriptionDispensa[];
    date: Date;
    ambito?: 'publico' | 'privado';
    tratamientoProlongado?: number;
    treatmentGroupId?: string;
    ordenTratamiento?: number;
    identificadoresExternos?: IExternalIdentifier[];
    syncExterno?: IExternalSync;
    trimestral?: boolean;
    organizacion?: {
        _id?: string;
        nombre?: string;
        direccion?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

