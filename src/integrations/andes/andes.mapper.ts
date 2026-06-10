import { andesMessages } from './lang';
import {
    AndesPrescription,
    AndesInsumoPayload,
    AndesMedicamentoPayload,
    AndesPatientPayload,
    AndesPatient,
    AndesMPIPatient,
    AndesSnomedConcept,
} from './andes.types';

export interface LocalPatient {
    dni?: string;
    lastName: string;
    firstName: string;
    fechaNac?: Date | null;
    sex: string;
    idMPI?: string;
    obraSocial?: { nombre?: string; numeroAfiliado?: string };
    nombreAutopercibido?: string;
}

export interface LocalProfessional {
    idAndes?: string;
    username: string;
    businessName: string;
    enrollment?: string;
    cuil?: string;
    profesionGrado?: Array<{ profesion?: string }>;
}

export interface LocalSupply {
    name?: string;
    snomedConcept?: { conceptId: string; term: string };
    specification?: string;
    _id?: string;
    id?: string;
}

export interface LocalPrescriptionSupply {
    supply: LocalSupply;
    quantity?: number;
    quantityPresentation?: number;
    diagnostic?: string;
    indication?: string;
    triplicate?: boolean;
    duplicate?: boolean;
    triplicateData?: {
        serie?: number | string;
        numero?: number | string;
    };
}

export interface LocalPrescription {
    _id: { toString(): string };
    date: string;
    supplies: LocalPrescriptionSupply[];
    organizacion?: { _id?: string; nombre?: string; direccion?: string };
    trimestral?: boolean;
}

interface NameParts {
    nombre: string;
    apellido: string;
}

export class AndesMapper {

    static splitBusinessName(businessName: string): NameParts {
        const parts = businessName ? businessName.split(',') : [];
        return {
            apellido: parts[0] ? parts[0].trim() : '',
            nombre: parts[1] ? parts[1].trim() : '',
        };
    }

    static normalizeCuit(cuit: string): string {
        const digits = cuit.replace(/\D/g, '');
        if (digits.length === 11) {
            return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
        }
        return cuit;
    }

    static toLocalPatient(andesPatient: AndesPatient): Partial<LocalPatient> {
        return {
            dni: andesPatient.documento,
            firstName: andesPatient.nombre,
            lastName: andesPatient.apellido,
            sex: andesPatient.sexo,
            idMPI: andesPatient.id,
            fechaNac: andesPatient.fechaNacimiento ? new Date(andesPatient.fechaNacimiento) : undefined,
            obraSocial: andesPatient.obraSocial ? {
                nombre: andesPatient.obraSocial.nombre,
                numeroAfiliado: andesPatient.obraSocial.numeroAfiliado,
            } : undefined,
        };
    }

    static toAndesPatient(local: LocalPatient): AndesPatientPayload {
        return {
            nombre: local.firstName,
            apellido: local.lastName,
            documento: local.dni || '',
            sexo: local.sex.toLowerCase(),
            genero: local.sex.toLowerCase(),
            fechaNacimiento: local.fechaNac || undefined,
            estado: 'temporal',
            alias: local.nombreAutopercibido || '',
        };
    }

    static toAndesProfessional(professional: LocalProfessional): {
        id: string; nombre: string; apellido: string;
        documento: string; profesion: string; matricula: string; especialidad: string;
        cuil?: string;
    } {
        const { nombre, apellido } = this.splitBusinessName(professional.businessName);
        return {
            id: professional.idAndes || '',
            nombre,
            apellido,
            documento: professional.username,
            profesion: professional.profesionGrado?.[0]?.profesion || '',
            matricula: professional.enrollment || '',
            especialidad: '',
            cuil: professional.cuil || '',
        };
    }

    static toAndesInsumo(
        prescription: LocalPrescription,
        professional: LocalProfessional,
        patient: LocalPatient,
        originalSupply?: LocalSupply,
    ): AndesInsumoPayload {
        const supplyInfo = prescription.supplies[0];
        const supply = supplyInfo.supply;
        const originalSupplyId = originalSupply?._id || originalSupply?.id || supply._id || supply.id || '';
        const { nombre, apellido } = this.splitBusinessName(professional.businessName);

        return {
            organizacion: {
                id: prescription.organizacion?._id || undefined,
                nombre: prescription.organizacion?.nombre || 'Recetar',
            },
            profesional: {
                id: professional.idAndes || '',
                nombre,
                apellido,
                documento: professional.username,
                profesion: professional.profesionGrado?.[0]?.profesion || '',
                matricula: professional.enrollment || '',
                especialidad: '',
            },
            fechaRegistro: prescription.date,
            fechaPrestacion: prescription.date,
            idPrestacion: prescription._id.toString(),
            idRegistro: prescription._id.toString(),
            diagnostico: supplyInfo.diagnostic || andesMessages.mapper.withoutDiagnosis,
            insumo: {
                ...(supply.snomedConcept
                    ? {
                        concepto: {
                            conceptId: supply.snomedConcept.conceptId,
                            term: supply.snomedConcept.term,
                        },
                    }
                    : {
                        generico: {
                            id: originalSupplyId.toString(),
                            nombre: supply.name || '',
                        },
                    }),
                cantidad: supplyInfo.quantity || 1,
                especificacion: this.buildSpecification(supplyInfo, supply),
                diagnostico: supplyInfo.diagnostic || andesMessages.mapper.withoutDiagnosis,
            },
            paciente: {
                id: patient.idMPI || '',
                nombre: patient.firstName,
                apellido: patient.lastName,
                documento: patient.dni || '',
                sexo: patient.sex ? patient.sex.toLowerCase() : '',
                fechaNacimiento: patient.fechaNac ? new Date(patient.fechaNac).toISOString() : undefined,
                obraSocial: patient.obraSocial
                    ? { nombre: patient.obraSocial.nombre || '', numeroAfiliado: patient.obraSocial.numeroAfiliado }
                    : undefined,
            },
            origenExterno: {
                id: prescription._id.toString(),
                app: { nombre: 'recetar' },
                fecha: prescription.date,
            },
        };
    }

    static toAndesMedicamento(
        prescription: LocalPrescription,
        professional: LocalProfessional,
        patient: LocalPatient,
    ): AndesMedicamentoPayload {
        const supplyInfo = prescription.supplies[0];
        const supply = supplyInfo.supply;
        const { nombre, apellido } = this.splitBusinessName(professional.businessName);

        const indication = supplyInfo.indication || '';
        const spec = supply.specification || '';
        const notaMedicaParts: string[] = [];
        if (indication) { notaMedicaParts.push(indication); }
        if (spec) { notaMedicaParts.push(`${andesMessages.mapper.specificationPrefix}${spec}`); }
        const notaMedica = notaMedicaParts.join(' - ');

        let tipoReceta: 'triplicado' | 'duplicado' | 'simple' = 'simple';
        if (supplyInfo.triplicate) { tipoReceta = 'triplicado'; } else if (supplyInfo.duplicate) { tipoReceta = 'duplicado'; }

        const serie = supplyInfo.triplicateData?.serie?.toString() || '';
        const numero = supplyInfo.triplicateData?.numero?.toString() || '';

        return {
            organizacion: {
                id: prescription.organizacion?._id || undefined,
                nombre: prescription.organizacion?.nombre || 'Recetar',
            },
            profesional: {
                id: professional.idAndes || '',
                nombre,
                apellido,
                documento: professional.username,
                profesion: professional.profesionGrado?.[0]?.profesion || '',
                matricula: professional.enrollment || '',
                especialidad: '',
            },
            fechaRegistro: prescription.date,
            idPrestacion: prescription._id.toString(),
            idRegistro: prescription._id.toString(),
            diagnostico: supplyInfo.diagnostic || andesMessages.mapper.withoutDiagnosis,
            paciente: {
                id: patient.idMPI || '',
                nombre: patient.firstName,
                apellido: patient.lastName,
                documento: patient.dni || '',
                sexo: patient.sex ? patient.sex.toLowerCase() : '',
                fechaNacimiento: patient.fechaNac ? new Date(patient.fechaNac).toISOString() : undefined,
                obraSocial: patient.obraSocial
                    ? { nombre: patient.obraSocial.nombre || '', numeroAfiliado: patient.obraSocial.numeroAfiliado }
                    : undefined,
            },
            medicamento: {
                diagnostico: supplyInfo.diagnostic || andesMessages.mapper.withoutDiagnosis,
                concepto: supply.snomedConcept as AndesSnomedConcept | undefined,
                presentacion: '',
                unidades: '',
                cantidad: supplyInfo.quantityPresentation || 1,
                cantEnvases: supplyInfo.quantity || 1,
                dosisDiaria: {
                    dosis: null,
                    dias: null,
                    notaMedica: notaMedica || undefined,
                },
                tratamientoProlongado: !!prescription.trimestral,
                tiempoTratamiento: prescription.trimestral ? { id: '3', nombre: '3 meses' } : null,
                tipoReceta,
                serie,
                numero,
            },
            origenExterno: {
                id: prescription._id.toString(),
                nombre: 'RecetAr',
                fecha: prescription.date,
            },
        };
    }

    static toLocalPatientFromMPI(mpiPatient: AndesMPIPatient): Record<string, unknown> {
        return {
            dni: mpiPatient.documento,
            firstName: mpiPatient.nombre,
            lastName: mpiPatient.apellido,
            fechaNac: mpiPatient.fechaNacimiento ? new Date(mpiPatient.fechaNacimiento) : undefined,
            sex: mpiPatient.sexo.charAt(0).toUpperCase() + mpiPatient.sexo.slice(1).toLowerCase(),
            status: mpiPatient.estado
                ? mpiPatient.estado.charAt(0).toUpperCase() + mpiPatient.estado.slice(1).toLowerCase()
                : undefined,
            genero: mpiPatient.genero,
            nombreAutopercibido: mpiPatient.alias || '',
            idMPI: mpiPatient.id,
            tipoDocumentoExtranjero: mpiPatient.tipoIdentificacion || '',
            nroDocumentoExtranjero: mpiPatient.numeroIdentificacion || '',
            estado: mpiPatient.estado,
            cuil: mpiPatient.cuil || null,
        };
    }

    private static buildSpecification(supplyInfo: LocalPrescriptionSupply, supply: LocalSupply): string {
        const indication = supplyInfo.indication || '';
        const spec = supply.specification || '';
        const parts: string[] = [];
        if (indication) { parts.push(indication); }
        if (spec) { parts.push(`${andesMessages.mapper.specificationPrefix}${spec}`); }
        return parts.join(' - ') || andesMessages.mapper.withoutSpecification;
    }
}
