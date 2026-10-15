import { andesMessages } from './lang';
import {
    AndesPrescription,
    AndesInsumoPayload,
    AndesMedicamentoPayload,
    AndesPatientPayload,
    AndesPatient,
    AndesMPIPatient,
    AndesSnomedConcept,
    ValidatedPatient,
    ValidationResponse,
    AndesProfesionalDetalle,
    AndesFarmacia,
    AndesFormacionGrado,
    MatriculaEstado,
} from './andes.types';

export interface LocalPatient {
    dni?: string;
    lastName: string;
    firstName: string;
    fechaNac?: Date | null;
    sex: string;
    genero?: string;
    idMPI?: string;
    obraSocial?: { nombre?: string; codigoPuco?: number; numeroAfiliado?: string };
    nombreAutopercibido?: string;
}

export interface LocalProfessional {
    idAndes?: string;
    username: string;
    businessName: string;
    firstName?: string;
    lastName?: string;
    enrollment?: string;
    cuil?: string;
    profesionGrado?: Array<{ profesion?: string }>;
}

export interface SyncableProfessional {
    cuil?: string;
    firstName?: string;
    lastName?: string;
    businessName?: string;
    idAndes?: string;
    profesionGrado: Array<{
        profesion: string;
        codigoProfesion: string;
        numeroMatricula: string;
        vencimiento?: Date;
        estado: MatriculaEstado;
    }>;
}

export interface SyncablePharmacist {
    cuil?: string;
    razonSocial?: string;
    responsibleDTEnrollment?: string;
    businessName?: string;
    idAndes?: string;
}

export interface MatriculaGrado {
    profesion: string;
    codigo: number | string;
    numero: number | string;
    inicio?: string;
    fin?: string;
    baja?: { motivo?: string; fecha?: string | null } | null;
    estado: MatriculaEstado;
}

export interface MatriculasEstadoResponse {
    documento: string;
    nombre: string;
    apellido: string;
    profesionalMatriculado: boolean;
    estadoGeneral: MatriculaEstado;
    matriculas: MatriculaGrado[];
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
    obraSocial?: { nombre?: string; codigoPuco?: number; numeroAfiliado?: string };
}

export interface LocalPrescription {
    _id: { toString(): string };
    date: string;
    supplies: LocalPrescriptionSupply[];
    organizacion?: { _id?: string; nombre?: string; direccion?: string };
    tratamientoProlongado?: number;
    trimestral?: boolean;
}

interface NameParts {
    nombre: string;
    apellido: string;
}

export class AndesMapper {

    static repairText(value?: string | null): string {
        if (!value) {
            return value || '';
        }
        if (!/[\u0080-\u00FF]/.test(value)) {
            return value;
        }

        const repaired = Buffer.from(value, 'latin1').toString('utf8');
        return (repaired.includes('\uFFFD') ? value : repaired).normalize('NFC');
    }

    static repairName(value?: string | null): string {
        return AndesMapper.toTitleCase(AndesMapper.repairText(value));
    }

    static toTitleCase(value?: string | null): string {
        if (!value) {
            return value || '';
        }

        const particles = new Set([
            'de', 'del', 'la', 'las', 'los', 'y', 'e',
            'da', 'das', 'do', 'dos', 'van', 'von', 'bin',
        ]);

        return value
            .toLocaleLowerCase('es-AR')
            .split(/\s+/)
            .map((word, index) => {
                if (index > 0 && particles.has(word)) {
                    return word;
                }
                return word.replace(/(^|[-'])(\p{L})/gu, (_match, separator: string, letter: string) => {
                    return separator + letter.toLocaleUpperCase('es-AR');
                });
            })
            .join(' ');
    }

    static normalizeGenero(value?: string | null): string {
        const normalized = (value || '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        if (normalized === 'femenino') { return 'mujer'; }
        if (normalized === 'masculino') { return 'varon'; }
        return normalized;
    }

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

    static resolveNameParts(professional: LocalProfessional): NameParts {
        if (professional.firstName || professional.lastName) {
            return {
                nombre: professional.firstName || '',
                apellido: professional.lastName || '',
            };
        }
        return this.splitBusinessName(professional.businessName);
    }

    static normalizeProfessionalBusinessName(apellido: string, nombre: string): string {
        return [apellido, nombre]
            .filter(part => !!part && part.trim().length > 0)
            .join(' ')
            .trim()
            .toUpperCase();
    }

    static estadoMatricula(formacion: AndesFormacionGrado): MatriculaEstado {
        const matriculaciones = (formacion?.matriculacion || []).filter(Boolean);
        if (!matriculaciones.length) {
            return 'sin-matricula';
        }
        if (formacion.matriculado === false) {
            return 'suspendida';
        }
        const ultima = matriculaciones[matriculaciones.length - 1];
        if (ultima.baja && ultima.baja.fecha) {
            return 'baja';
        }
        if (ultima.fin && new Date(ultima.fin).getTime() < Date.now()) {
            return 'vencida';
        }
        return 'vigente';
    }

    static estadoGeneral(estados: MatriculaEstado[]): MatriculaEstado {
        if (estados.includes('vigente')) { return 'vigente'; }
        if (estados.includes('vencida')) { return 'vencida'; }
        if (estados.includes('suspendida')) { return 'suspendida'; }
        if (estados.includes('baja')) { return 'baja'; }
        return 'sin-matricula';
    }

    static toProfesionGrado(profesional: AndesProfesionalDetalle): SyncableProfessional['profesionGrado'] {
        const formaciones = profesional?.profesiones || [];
        return formaciones
            .filter(formacion => formacion?.matriculacion?.length)
            .map(formacion => {
                const matriculaciones = formacion.matriculacion || [];
                const ultima = matriculaciones[matriculaciones.length - 1];
                return {
                    profesion: formacion.profesion?.nombre || '',
                    codigoProfesion: formacion.profesion?.codigo != null ? String(formacion.profesion.codigo) : '',
                    numeroMatricula: ultima?.matriculaNumero != null ? String(ultima.matriculaNumero) : '',
                    vencimiento: ultima?.fin ? new Date(ultima.fin) : undefined,
                    estado: this.estadoMatricula(formacion),
                };
            })
            .filter(entry => entry.profesion && entry.codigoProfesion && entry.numeroMatricula);
    }

    static toSyncableProfessional(profesional: AndesProfesionalDetalle): SyncableProfessional {
        const nombre = profesional?.nombre || '';
        const apellido = profesional?.apellido || '';
        return {
            cuil: profesional?.cuit || undefined,
            firstName: nombre || undefined,
            lastName: apellido || undefined,
            businessName: this.normalizeProfessionalBusinessName(apellido, nombre) || undefined,
            idAndes: profesional?.id || undefined,
            profesionGrado: this.toProfesionGrado(profesional),
        };
    }

    static toSyncablePharmacist(farmacia: AndesFarmacia): SyncablePharmacist {
        const businessName = farmacia?.razonSocial || farmacia?.denominacion || '';
        return {
            cuil: farmacia?.cuit || undefined,
            razonSocial: farmacia?.razonSocial || undefined,
            responsibleDTEnrollment: farmacia?.matriculaDTResponsable || undefined,
            businessName: businessName || undefined,
            idAndes: farmacia?._id || farmacia?.id || undefined,
        };
    }

    static toMatriculasEstado(profesional: AndesProfesionalDetalle): MatriculasEstadoResponse {
        const profesiones = profesional?.profesiones || [];
        const matriculas: MatriculaGrado[] = profesiones
            .filter(formacion => formacion?.matriculacion?.length)
            .map(formacion => {
                const matriculaciones = formacion.matriculacion || [];
                const ultima = matriculaciones[matriculaciones.length - 1];
                return {
                    profesion: formacion.profesion?.nombre || '',
                    codigo: formacion.profesion?.codigo ?? '',
                    numero: ultima?.matriculaNumero ?? '',
                    inicio: ultima?.inicio,
                    fin: ultima?.fin,
                    baja: ultima?.baja || null,
                    estado: this.estadoMatricula(formacion),
                };
            });

        return {
            documento: profesional?.documento || '',
            nombre: profesional?.nombre || '',
            apellido: profesional?.apellido || '',
            profesionalMatriculado: profesiones.length > 0,
            estadoGeneral: this.estadoGeneral(matriculas.map(m => m.estado)),
            matriculas,
        };
    }

    static toLocalPatient(andesPatient: AndesPatient): Partial<LocalPatient> {
        return {
            dni: andesPatient.documento,
            firstName: AndesMapper.repairName(andesPatient.nombre),
            lastName: AndesMapper.repairName(andesPatient.apellido),
            sex: andesPatient.sexo,
            idMPI: andesPatient.id,
            fechaNac: andesPatient.fechaNacimiento ? new Date(andesPatient.fechaNacimiento) : undefined,
            obraSocial: andesPatient.obraSocial ? {
                nombre: AndesMapper.repairText(andesPatient.obraSocial.nombre),
                codigoPuco: andesPatient.obraSocial.codigoPuco,
                numeroAfiliado: andesPatient.obraSocial.numeroAfiliado,
            } : undefined,
        };
    }

    static toAndesPatient(local: LocalPatient): AndesPatientPayload {
        return {
            nombre: AndesMapper.repairText(local.firstName),
            apellido: AndesMapper.repairText(local.lastName),
            documento: local.dni || '',
            sexo: local.sex.toLowerCase(),
            genero: AndesMapper.normalizeGenero(local.genero || local.sex),
            fechaNacimiento: local.fechaNac || undefined,
            estado: 'temporal',
            alias: AndesMapper.repairText(local.nombreAutopercibido),
        };
    }

    static toAndesProfessional(professional: LocalProfessional): {
        id: string; nombre: string; apellido: string;
        documento: string; profesion: string; matricula: string; especialidad: string;
        cuil?: string;
    } {
        const { nombre, apellido } = this.resolveNameParts(professional);
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
        const { nombre, apellido } = this.resolveNameParts(professional);

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
                obraSocial: (supplyInfo.obraSocial?.nombre
                    ? { nombre: supplyInfo.obraSocial.nombre, codigoPuco: supplyInfo.obraSocial.codigoPuco, numeroAfiliado: supplyInfo.obraSocial.numeroAfiliado }
                    : patient.obraSocial
                        ? { nombre: patient.obraSocial.nombre || '', codigoPuco: patient.obraSocial.codigoPuco, numeroAfiliado: patient.obraSocial.numeroAfiliado }
                        : undefined),
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
        const { nombre, apellido } = this.resolveNameParts(professional);

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

        const mesesTratamiento = prescription.tratamientoProlongado ?? (prescription.trimestral ? 3 : undefined);

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
                obraSocial: (supplyInfo.obraSocial?.nombre
                    ? { nombre: supplyInfo.obraSocial.nombre, codigoPuco: supplyInfo.obraSocial.codigoPuco, numeroAfiliado: supplyInfo.obraSocial.numeroAfiliado }
                    : patient.obraSocial
                        ? { nombre: patient.obraSocial.nombre || '', codigoPuco: patient.obraSocial.codigoPuco, numeroAfiliado: patient.obraSocial.numeroAfiliado }
                        : undefined),
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
                tratamientoProlongado: !!mesesTratamiento,
                tiempoTratamiento: mesesTratamiento
                    ? { id: String(mesesTratamiento), nombre: `${mesesTratamiento} meses` }
                    : null,
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
            _id: mpiPatient._id || mpiPatient.id,
            dni: mpiPatient.documento || '',
            firstName: AndesMapper.repairName(mpiPatient.nombre),
            lastName: AndesMapper.repairName(mpiPatient.apellido),
            fechaNac: mpiPatient.fechaNacimiento ? new Date(mpiPatient.fechaNacimiento) : undefined,
            sex: mpiPatient.sexo
                ? mpiPatient.sexo.charAt(0).toUpperCase() + mpiPatient.sexo.slice(1).toLowerCase()
                : '',
            status: mpiPatient.estado
                ? mpiPatient.estado.charAt(0).toUpperCase() + mpiPatient.estado.slice(1).toLowerCase()
                : undefined,
            genero: mpiPatient.genero ? AndesMapper.normalizeGenero(mpiPatient.genero) : undefined,
            nombreAutopercibido: AndesMapper.repairName(mpiPatient.alias),
            idMPI: mpiPatient.id || mpiPatient._id,
            tipoDocumentoExtranjero: mpiPatient.tipoIdentificacion || '',
            nroDocumentoExtranjero: mpiPatient.numeroIdentificacion || '',
            estado: mpiPatient.estado,
            cuil: mpiPatient.cuil || null,
            contactos: (mpiPatient.contacto || [])
                .filter((contacto) => !!contacto?.valor)
                .map((contacto) => ({
                    tipo: contacto.tipo,
                    valor: AndesMapper.repairText(contacto.valor),
                    ranking: contacto.ranking ?? 0,
                    activo: contacto.activo ?? true,
                })),
            direcciones: (mpiPatient.direccion || [])
                .filter((direccion) => !!direccion?.valor || !!direccion?.ubicacion)
                .map((direccion) => ({
                    calle: AndesMapper.repairText(direccion.valor),
                    codigoPostal: direccion.codigoPostal || '',
                    barrio: AndesMapper.repairText(direccion.ubicacion?.barrio?.nombre),
                    localidad: AndesMapper.repairText(direccion.ubicacion?.localidad?.nombre),
                    provincia: AndesMapper.repairText(direccion.ubicacion?.provincia?.nombre),
                    pais: AndesMapper.repairText(direccion.ubicacion?.pais?.nombre),
                    ranking: direccion.ranking ?? 0,
                    activo: direccion.activo ?? true,
                    geoReferencia: direccion.geoReferencia,
                    situacionCalle: direccion.situacionCalle,
                })),
        };
    }

    static toValidatedPatient(mpiPatient: AndesMPIPatient): ValidatedPatient {
        return {
            dni: mpiPatient.documento || '',
            nombre: AndesMapper.repairName(mpiPatient.nombre),
            apellido: AndesMapper.repairName(mpiPatient.apellido),
            sexo: mpiPatient.sexo.charAt(0).toUpperCase() + mpiPatient.sexo.slice(1).toLowerCase(),
            genero: mpiPatient.genero ? AndesMapper.normalizeGenero(mpiPatient.genero) : undefined,
            fechaNacimiento: mpiPatient.fechaNacimiento || '',
            cuil: mpiPatient.cuil,
            idMPI: mpiPatient.id,
        };
    }

    static toValidatedPatientFromResponse(data: ValidationResponse): ValidatedPatient {
        return {
            dni: data.documento,
            nombre: AndesMapper.repairName(data.nombre),
            apellido: AndesMapper.repairName(data.apellido),
            sexo: data.sexo.charAt(0).toUpperCase() + data.sexo.slice(1).toLowerCase(),
            fechaNacimiento: data.fechaNacimiento || '',
            cuil: data.cuil,
            direcciones: (data.direccion || []).map((direccion) => ({
                calle: AndesMapper.repairText(direccion.valor),
                codigoPostal: direccion.codigoPostal || '',
                barrio: AndesMapper.repairText(direccion.ubicacion?.barrio?.nombre),
                localidad: AndesMapper.repairText(direccion.ubicacion?.localidad?.nombre),
                provincia: AndesMapper.repairText(direccion.ubicacion?.provincia?.nombre),
                pais: AndesMapper.repairText(direccion.ubicacion?.pais?.nombre),
                ranking: direccion.ranking,
                activo: direccion.activo,
            })),
        };
    }

    static toAndesValidatedPatient(
        validated: ValidatedPatient,
        extras?: {
            contacto?: AndesPatientPayload['contacto'];
            direccion?: AndesPatientPayload['direccion'];
            alias?: string;
        },
    ): AndesPatientPayload {
        const sexo = (validated.sexo || '').toLowerCase();
        return {
            nombre: AndesMapper.repairText(validated.nombre),
            apellido: AndesMapper.repairText(validated.apellido),
            documento: validated.dni || undefined,
            sexo,
            genero: AndesMapper.normalizeGenero(validated.genero || sexo),
            fechaNacimiento: validated.fechaNacimiento || undefined,
            cuil: validated.cuil || undefined,
            ...(extras?.alias ? { alias: AndesMapper.repairText(extras.alias) } : {}),
            ...(extras?.contacto?.length ? { contacto: extras.contacto } : {}),
            ...(extras?.direccion?.length ? { direccion: extras.direccion } : {}),
            estado: 'validado',
        };
    }

    static toAndesTemporalPatient(data: {
        nombre: string;
        apellido: string;
        sexo: string;
        genero?: string;
        fechaNacimiento?: Date | string;
        alias?: string;
        cuil?: string;
        contacto?: AndesPatientPayload['contacto'];
        direccion?: AndesPatientPayload['direccion'];
    }): AndesPatientPayload {
        const sexo = (data.sexo || '').toLowerCase();
        return {
            nombre: AndesMapper.repairText(data.nombre),
            apellido: AndesMapper.repairText(data.apellido),
            sexo,
            genero: AndesMapper.normalizeGenero(data.genero || sexo),
            ...(data.fechaNacimiento ? { fechaNacimiento: data.fechaNacimiento } : {}),
            ...(data.alias ? { alias: AndesMapper.repairText(data.alias) } : {}),
            ...(data.cuil ? { cuil: data.cuil } : {}),
            ...(data.contacto?.length ? { contacto: data.contacto } : {}),
            ...(data.direccion?.length ? { direccion: data.direccion } : {}),
            estado: 'temporal',
        };
    }

    static isMPICreateSugeridos(
        response: unknown,
    ): response is { sugeridos: unknown[] } {
        return !!response
            && typeof response === 'object'
            && Array.isArray((response as { sugeridos?: unknown[] }).sugeridos);
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
