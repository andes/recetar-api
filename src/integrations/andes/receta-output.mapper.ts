import { IPrescription } from '../../modules/prescriptions/prescription.types';

const STATUS_TO_ESTADO: Record<string, string> = {
    Pendiente: 'pendiente',
    Dispensada: 'finalizada',
    Vencida: 'vencida',
    Suspendida: 'suspendida',
    Rechazada: 'rechazada',
};

export function toRecetaCompatible(prescription: IPrescription): Record<string, unknown> {
    const supply = prescription.supplies?.[0];
    const ext = (entidad: string) => prescription.identificadoresExternos?.find(e => e.entidad === entidad)?.valor;

    const estadoTipo = prescription.estadoActual?.tipo || STATUS_TO_ESTADO[prescription.status] || 'pendiente';
    const estadoDispensaTipo = prescription.estadoDispensaActual?.tipo
        || (prescription.status === 'Dispensada' ? 'dispensada' : 'sin-dispensa');

    return {
        _id: prescription._id.toString(),
        idReceta: prescription.prescriptionId,
        organizacion: prescription.organizacion
            ? { id: prescription.organizacion._id, nombre: prescription.organizacion.nombre }
            : { nombre: 'Recetar' },
        profesional: {
            id: prescription.professional?.userId?.toString() || '',
            nombre: prescription.professional?.businessName || '',
        },
        diagnostico: supply?.diagnostic ? { descripcion: supply.diagnostic } : undefined,
        fechaRegistro: prescription.date,
        fechaPrestacion: prescription.date,
        idPrestacion: ext('prestacion'),
        idRegistro: ext('registro'),
        medicamento: {
            concepto: supply?.supply?.code?.source === 'SNOMED'
                ? { conceptId: supply.supply.code.value, term: supply.supply.name }
                : undefined,
            nombre: supply?.supply?.name,
            presentacion: supply?.supply?.firstPresentation || '',
            cantidad: supply?.quantityPresentation,
            cantEnvases: supply?.quantity,
            dosisDiaria: supply?.indication ? { notaMedica: supply.indication } : undefined,
            tratamientoProlongado: !!prescription.tratamientoProlongado,
            tiempoTratamiento: prescription.tratamientoProlongado
                ? { id: String(prescription.tratamientoProlongado), nombre: `${prescription.tratamientoProlongado} meses` }
                : null,
            ordenTratamiento: prescription.ordenTratamiento,
            tipoReceta: supply?.triplicate ? 'triplicado' : (supply?.duplicate ? 'duplicado' : 'simple'),
        },
        dispensa: prescription.dispensa?.length
            ? prescription.dispensa
            : (prescription.dispensedBy
                ? [{ descripcion: prescription.dispensedBy.businessName, fecha: prescription.dispensedAt, organizacion: { nombre: prescription.dispensedBy.businessName } }]
                : []),
        estados: prescription.estados?.length
            ? prescription.estados
            : [{ tipo: estadoTipo, fecha: prescription.date }],
        estadoActual: { tipo: estadoTipo },
        estadosDispensa: prescription.estadosDispensa?.length
            ? prescription.estadosDispensa
            : [{ tipo: estadoDispensaTipo, fecha: prescription.dispensedAt }],
        estadoDispensaActual: { tipo: estadoDispensaTipo, fecha: prescription.dispensedAt },
        paciente: {
            id: prescription.patient?.idMPI,
            nombre: prescription.patient?.firstName,
            apellido: prescription.patient?.lastName,
            documento: prescription.patient?.dni,
            sexo: prescription.patient?.sex,
            fechaNacimiento: prescription.patient?.fechaNac,
        },
    };
}
