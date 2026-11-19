import {
    PraxysPrescriptionRequest,
    PraxysPaciente,
    PraxysPrescriptor,
    PraxysRenglon,
    PraxysCoberturaSalud,
} from './praxys.types';
import { IPrescription, IPrescriptionSupply } from '../../modules/prescriptions/prescription.types';
import { AndesPrescription } from '../andes/andes.types';
import { env } from '../../config/config';

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

export class PraxysMapper {

    static toPraxysPrescription(
        prescription: IPrescription,
        professional: LocalProfessional,
        patient: LocalPatient,
    ): PraxysPrescriptionRequest {
        const renglones = prescription.supplies.map(supply => this.buildRenglon(supply));
        const prescriptor = this.buildPrescriptor(professional);
        const praxysPatient = this.buildPaciente(patient, prescription.patient);
        const cobertura = this.buildCobertura(prescription);
        const meses = prescription.tratamientoProlongado && prescription.tratamientoProlongado > 1
            ? prescription.tratamientoProlongado
            : undefined;
        const idAtencion = prescription.treatmentGroupId || prescription.prescriptionId;

        return {
            paciente: praxysPatient,
            ...(cobertura && { coberturaSalud: cobertura }),
            prescriptor,
            renglones,
            tratamientoProlongado: !!meses,
            ...(idAtencion ? { idAtencion } : {}),
            ...(meses ? {
                recetas: {
                    cantidadRecetas: meses,
                    cantidadDiasEntreRecetas: 30,
                },
            } : {}),
        };
    }

    static toPraxysFromDoc(prescription: IPrescription): PraxysPrescriptionRequest {
        return this.toPraxysPrescription(
            prescription,
            this.localProfessionalFromDoc(prescription.professional),
            this.localPatientFromDoc(prescription.patient),
        );
    }

    static localProfessionalFromDoc(professional: IPrescription['professional']): LocalProfessional {
        return {
            username: professional.userId?.toString() || '',
            businessName: professional.businessName || '',
            enrollment: professional.enrollment,
            cuil: professional.cuil,
            profesionGrado: professional.profesionGrado,
        };
    }

    static localPatientFromDoc(patient: IPrescription['patient']): LocalPatient {
        return {
            dni: patient.dni,
            firstName: patient.firstName,
            lastName: patient.lastName,
            sex: patient.sex,
            fechaNac: patient.fechaNac,
            idMPI: patient.idMPI,
            obraSocial: patient.obraSocial,
        };
    }

    static toPraxysFromAndes(andesPrescription: AndesPrescription): PraxysPrescriptionRequest {
        const praxysPatient = this.buildPacienteFromAndes(andesPrescription);
        const prescriptor = this.buildPrescriptorFromAndes(andesPrescription);
        const renglones = this.buildRenglonesFromAndes(andesPrescription);

        return {
            paciente: praxysPatient,
            prescriptor,
            renglones,
            tratamientoProlongado: false,
        };
    }

    static toLocalPatient(praxysPaciente: PraxysPaciente): LocalPatient {
        return {
            dni: praxysPaciente.numeroDocumento?.toString(),
            firstName: praxysPaciente.nombre,
            lastName: praxysPaciente.apellido,
            sex: praxysPaciente.sexo,
            fechaNac: praxysPaciente.fechaNacimiento ? new Date(praxysPaciente.fechaNacimiento) : undefined,
        };
    }

    // Praxys v2 acepta M (masculino), F (femenino) y X (otro).
    private static normalizeSex(sex?: string): string {
        const value = (sex || '').trim();
        if (!value) {
            return '';
        }
        const normalized = value.toLowerCase();
        if (normalized === 'otro' || normalized === 'x') {
            return 'X';
        }
        const first = normalized.charAt(0);
        if (first === 'm') {
            return 'M';
        }
        if (first === 'f') {
            return 'F';
        }
        return '';
    }

    private static buildPaciente(
        patient: LocalPatient,
        prescriptionPatient: IPrescription['patient']
    ): PraxysPaciente {
        const obraSocial = prescriptionPatient.obraSocial || patient.obraSocial;
        const cuil = this.toCuitNumber(prescriptionPatient.cuil);
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
            sexo: this.normalizeSex(patient.sex || prescriptionPatient.sex),
            ...(cuil ? { cuil } : {}),
        };
    }

    private static buildPacienteFromAndes(andesPrescription: AndesPrescription): PraxysPaciente {
        const paciente = andesPrescription.paciente;
        const cuil = this.toCuitNumber(paciente.cuil);
        return {
            nombre: (paciente.nombre || '').toUpperCase(),
            apellido: (paciente.apellido || '').toUpperCase(),
            tipoDocumento: 'DNI',
            numeroDocumento: parseInt(paciente.documento || '0', 10),
            fechaNacimiento: paciente.fechaNacimiento || '',
            sexo: this.normalizeSex(paciente.sexo),
            ...(cuil ? { cuil } : {}),
        };
    }

    private static buildPrescriptor(professional: LocalProfessional): PraxysPrescriptor {
        const grado = professional.profesionGrado?.[0];
        const matricula = grado?.numeroMatricula || professional.enrollment || '';
        const cuit = this.toCuitNumber(professional.cuil);

        return {
            matricula,
            tipoMatricula: env.PRAXYS_MATRICULA_TIPO || 'P',
            idProvinciaMatricula: env.PRAXYS_MATRICULA_PROVINCIA || 'Q',
            tipoPrescriptor: this.mapTipoPrescriptor(grado?.profesion),
            ...(cuit ? { cuit } : {}),
        };
    }

    // Praxys solo distingue médico (M) y odontólogo (O) como tipo de prescriptor.
    private static mapTipoPrescriptor(profesion?: string): string {
        const normalized = (profesion || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase();
        if (normalized.includes('ODONT')) {
            return 'O';
        }
        if (normalized.includes('MEDIC')) {
            return 'M';
        }
        return '';
    }

    private static toCuitNumber(cuil?: string): number | undefined {
        const digits = (cuil || '').replace(/\D/g, '');
        if (!digits) {
            return undefined;
        }
        const value = Number(digits);
        return Number.isFinite(value) ? value : undefined;
    }

    private static buildPrescriptorFromAndes(andesPrescription: AndesPrescription): PraxysPrescriptor {
        const profesional = andesPrescription.profesional;
        return {
            matricula: profesional.matricula || '',
            tipoMatricula: 'N',
            idProvinciaMatricula: 'C',
            tipoPrescriptor: 'M',
        };
    }

    private static buildCobertura(prescription: IPrescription): PraxysCoberturaSalud | undefined {
        const obraSocial = prescription.patient?.obraSocial;
        if (!obraSocial?.nombre || !obraSocial?.numeroAfiliado) {
            return undefined;
        }

        return {
            idObraSocial: 0,
            idConvenio: 0,
            numeroAfiliado: obraSocial.numeroAfiliado,
            codigoPlan: '',
            nombrePlan: obraSocial.nombre,
        };
    }

    private static buildRenglon(supply: IPrescriptionSupply): PraxysRenglon {
        const supplyData = supply.supply;
        const codigoAlfabeta = this.extractCodigoAlfabeta(supplyData);
        const codigoBarras = supplyData.barCode || '';
        const indicaciones = this.buildIndicaciones(supply);

        return {
            tipoPrescripcion: 'M',
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

    private static buildRenglonesFromAndes(andesPrescription: AndesPrescription): PraxysRenglon[] {
        const renglones: PraxysRenglon[] = [];

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
}
