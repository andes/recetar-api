import {
    PraxysEventoDispensa,
    PraxysEventoPrescripcion,
    PraxysEventoReceta,
    PraxysEventoRenglon,
} from './praxys-events.types';

export interface PraxysDispensaEntry {
    descripcion?: string;
    cantidad?: number;
    fecha?: Date;
    sistema: string;
    numeroAutorizacion?: string;
}

export interface PraxysRecetaMetadata {
    idReceta?: string;
    numeroReceta?: string;
    cuirs?: string[];
}

export class PraxysEventsMapper {
    static toDispensaEntries(payload: PraxysEventoDispensa): PraxysDispensaEntry[] {
        const fecha = payload.fecha ? new Date(payload.fecha) : new Date();
        return payload.dispensa.renglones.map(renglon => ({
            descripcion: renglon.producto?.descripcion
                || renglon.producto?.codigoBarras
                || 'Producto Praxys',
            cantidad: renglon.cantidadEnvases,
            fecha,
            sistema: 'praxys',
            numeroAutorizacion: payload.dispensa.numeroAutorizacion,
        }));
    }

    static toRecetaMetadata(
        receta: PraxysEventoReceta,
        renglones: PraxysEventoRenglon[] = [],
    ): PraxysRecetaMetadata {
        const cuirs = renglones
            .map(renglon => renglon.cuir)
            .filter((cuir): cuir is string => !!cuir);

        return {
            ...(receta.id != null ? { idReceta: String(receta.id) } : {}),
            ...(receta.numero ? { numeroReceta: receta.numero } : {}),
            ...(cuirs.length ? { cuirs } : {}),
        };
    }

    static toPatient(payload: PraxysEventoPrescripcion): {
        firstName: string;
        lastName: string;
        dni: string;
        sex: string;
        obraSocial?: { nombre?: string; numeroAfiliado?: string };
    } {
        const nombre = payload.beneficiario?.nombre || '';
        const parts = nombre.trim().split(/\s+/).filter(Boolean);
        const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
        const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : nombre;

        return {
            firstName,
            lastName,
            dni: payload.beneficiario?.numeroDocumento?.toString() || '',
            sex: '',
            ...(payload.obraSocial?.nombre || payload.beneficiario?.numero
                ? {
                    obraSocial: {
                        ...(payload.obraSocial?.nombre ? { nombre: payload.obraSocial.nombre } : {}),
                        ...(payload.beneficiario?.numero ? { numeroAfiliado: payload.beneficiario.numero } : {}),
                    },
                }
                : {}),
        };
    }

    static toProfessional(payload: PraxysEventoPrescripcion): {
        businessName?: string;
        cuil?: string;
        enrollment?: string;
        profesionGrado?: Array<{ numeroMatricula?: string }>;
    } {
        const prescriptor = payload.prescriptor;
        return {
            ...(prescriptor?.nombre ? { businessName: prescriptor.nombre } : {}),
            ...(prescriptor?.cuit ? { cuil: prescriptor.cuit } : {}),
            ...(prescriptor?.matricula ? {
                enrollment: prescriptor.matricula,
                profesionGrado: [{ numeroMatricula: prescriptor.matricula }],
            } : {}),
        };
    }

    static toObraSocial(payload: PraxysEventoPrescripcion): { nombre?: string; codigoRNOS?: number } | undefined {
        if (!payload.obraSocial?.nombre && payload.obraSocial?.codigoRNOS == null) {
            return undefined;
        }
        return {
            ...(payload.obraSocial?.nombre ? { nombre: payload.obraSocial.nombre } : {}),
            ...(payload.obraSocial?.codigoRNOS != null ? { codigoRNOS: payload.obraSocial.codigoRNOS } : {}),
        };
    }
}
