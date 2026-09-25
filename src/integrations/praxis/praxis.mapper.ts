import {
    PraxisPrescriptionRequest,
    PraxisPaciente,
    PraxisPrescriptor,
    PraxisRenglon,
    PraxisCoberturaSalud,
} from './praxis.types';
import { IPrescription, IPrescriptionSupply } from '../../modules/prescriptions/prescription.types';
import { AndesPrescription } from '../andes/andes.types';

export interface LocalPatient {
    dni?: string;
    firstName: string;
    lastName: string;
    fechaNac?: Date | null;
    sex: string;
    idMPI?: string;
    obraSocial?: { nombre?: string; numeroAfiliado?: string };
}

export interface LocalProfessional {
    idAndes?: string;
    username: string;
    businessName: string;
    enrollment?: string;
    cuil?: string;
    profesionGrado?: Array<{ profesion?: string; codigoProfesion?: string; numeroMatricula?: string }>;
}

export class PraxisMapper {

    static toPraxisPrescription(
        prescription: IPrescription,
        professional: LocalProfessional,
        patient: LocalPatient,
    ): PraxisPrescriptionRequest {
        const renglones = prescription.supplies.map(supply => this.buildRenglon(supply));
        const prescriptor = this.buildPrescriptor(professional);
        const praxisPatient = this.buildPaciente(patient, prescription.patient);
        const cobertura = this.buildCobertura(prescription);

        return {
            paciente: praxisPatient,
            ...(cobertura && { coberturaSalud: cobertura }),
            prescriptor,
            renglones,
            tratamientoProlongado: !!prescription.trimestral,
        };
    }

    static toPraxisFromAndes(andesPrescription: AndesPrescription): PraxisPrescriptionRequest {
        const praxisPatient = this.buildPacienteFromAndes(andesPrescription);
        const prescriptor = this.buildPrescriptorFromAndes(andesPrescription);
        const renglones = this.buildRenglonesFromAndes(andesPrescription);

        return {
            paciente: praxisPatient,
            prescriptor,
            renglones,
            tratamientoProlongado: false,
        };
    }

    static toLocalPatient(praxisPaciente: PraxisPaciente): LocalPatient {
        return {
            dni: praxisPaciente.numeroDocumento?.toString(),
            firstName: praxisPaciente.nombre,
            lastName: praxisPaciente.apellido,
            sex: praxisPaciente.sexo,
            fechaNac: praxisPaciente.fechaNacimiento ? new Date(praxisPaciente.fechaNacimiento) : undefined,
        };
    }

    private static buildPaciente(
        patient: LocalPatient,
        prescriptionPatient: IPrescription['patient']
    ): PraxisPaciente {
        const obraSocial = prescriptionPatient.obraSocial || patient.obraSocial;
        return {
            nombre: (patient.firstName || prescriptionPatient.firstName || '').toUpperCase(),
            apellido: (patient.lastName || prescriptionPatient.lastName || '').toUpperCase(),
            tipoDocumento: 'DNI',
            numeroDocumento: parseInt(patient.dni || prescriptionPatient.dni || '0', 10),
            fechaNacimiento: patient.fechaNac
                ? new Date(patient.fechaNac).toISOString()
                : prescriptionPatient.fechaNac
                    ? new Date(prescriptionPatient.fechaNac).toISOString()
                    : '',
            sexo: (patient.sex || prescriptionPatient.sex || '').toUpperCase(),
        };
    }

    private static buildPacienteFromAndes(andesPrescription: AndesPrescription): PraxisPaciente {
        const paciente = andesPrescription.paciente;
        return {
            nombre: (paciente.nombre || '').toUpperCase(),
            apellido: (paciente.apellido || '').toUpperCase(),
            tipoDocumento: 'DNI',
            numeroDocumento: parseInt(paciente.documento || '0', 10),
            fechaNacimiento: paciente.fechaNacimiento || '',
            sexo: (paciente.sexo || '').toUpperCase(),
        };
    }

    private static buildPrescriptor(professional: LocalProfessional): PraxisPrescriptor {
        const matricula = professional.enrollment ||
            professional.profesionGrado?.[0]?.numeroMatricula || '';
        const tipoMatricula = professional.profesionGrado?.[0]?.codigoProfesion || 'N';

        return {
            matricula,
            tipoMatricula,
            idProvinciaMatricula: 'C',
            tipoPrescriptor: 'M',
        };
    }

    private static buildPrescriptorFromAndes(andesPrescription: AndesPrescription): PraxisPrescriptor {
        const profesional = andesPrescription.profesional;
        return {
            matricula: profesional.matricula || '',
            tipoMatricula: 'N',
            idProvinciaMatricula: 'C',
            tipoPrescriptor: 'M',
        };
    }

    private static buildCobertura(prescription: IPrescription): PraxisCoberturaSalud | undefined {
        const obraSocial = prescription.patient?.obraSocial;
        if (!obraSocial?.nombre) {
            return undefined;
        }

        return {
            idObraSocial: 0,
            idConvenio: 0,
            numeroAfiliado: obraSocial.numeroAfiliado || '',
            codigoPlan: '',
            nombrePlan: obraSocial.nombre,
        };
    }

    private static buildRenglon(supply: IPrescriptionSupply): PraxisRenglon {
        const supplyData = supply.supply;
        const codigoAlfabeta = this.extractCodigoAlfabeta(supplyData);
        const codigoBarras = supplyData.barCode || '';
        const indicaciones = this.buildIndicaciones(supply);

        return {
            tipoPrescripcion: this.mapTipoPrescripcion(supply),
            producto: {
                codigoAlfabeta,
                codigoBarras,
            },
            cantidadEnvases: supply.quantity || 1,
            diagnostico: {
                descripcion: supply.diagnostic || 'Sin diagnóstico específico',
                codigoCIE10: 'Z00',
            },
            indicaciones,
            ...(supply.indication && { observaciones: supply.indication }),
        };
    }

    private static buildRenglonesFromAndes(andesPrescription: AndesPrescription): PraxisRenglon[] {
        const renglones: PraxisRenglon[] = [];

        if (andesPrescription.medicamento) {
            const med = andesPrescription.medicamento;
            renglones.push({
                tipoPrescripcion: 'G',
                producto: {
                    codigoAlfabeta: parseInt(med.concepto?.conceptId || '0', 10),
                    codigoBarras: '',
                },
                cantidadEnvases: med.cantEnvases || 1,
                diagnostico: {
                    descripcion: andesPrescription.diagnostico?.term || 'Sin diagnóstico',
                    codigoCIE10: 'Z00',
                },
                indicaciones: med.dosisDiaria?.notaMedica || '',
            });
        }

        if (andesPrescription.insumo) {
            const ins = andesPrescription.insumo;
            renglones.push({
                tipoPrescripcion: 'G',
                producto: {
                    codigoAlfabeta: parseInt(ins.concepto?.conceptId || ins.generico?.id || '0', 10),
                    codigoBarras: '',
                },
                cantidadEnvases: ins.cantidad || 1,
                diagnostico: {
                    descripcion: ins.diagnostico || 'Sin diagnóstico',
                    codigoCIE10: 'Z00',
                },
                indicaciones: ins.especificacion || '',
            });
        }

        return renglones;
    }

    private static extractCodigoAlfabeta(supplyData: IPrescriptionSupply['supply']): number {
        if (supplyData.code?.source === 'ALFABETA' && supplyData.code.value) {
            return parseInt(supplyData.code.value, 10);
        }
        return 0;
    }

    private static buildIndicaciones(supply: IPrescriptionSupply): string {
        const parts: string[] = [];
        if (supply.indication) {
            parts.push(supply.indication);
        }
        if (supply.supply?.specification) {
            parts.push(`Especificación: ${supply.supply.specification}`);
        }
        return parts.join(' - ') || 'Según prescripción médica';
    }

    private static mapTipoPrescripcion(supply: IPrescriptionSupply): string {
        if (supply.supply?.type === 'magistral') {
            return 'M';
        }
        return 'G';
    }
}
