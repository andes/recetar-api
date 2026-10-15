function resolveEstadoPublicacion(source: Record<string, unknown>): string {
    const syncExterno = source['syncExterno'] as
        | { praxis?: { estado?: string } }
        | undefined;
    const estado = syncExterno?.praxis?.estado;
    return typeof estado === 'string' && estado ? estado : 'desconocido';
}

function stripExternalFields<T>(doc: T): T {
    if (!doc || typeof doc !== 'object') {
        return doc;
    }
    const candidate = doc as unknown as { toObject?: () => unknown };
    const source = typeof candidate.toObject === 'function'
        ? candidate.toObject()
        : doc;
    const copy = { ...(source as Record<string, unknown>) };
    copy['estadoPublicacion'] = resolveEstadoPublicacion(copy);
    delete copy['syncExterno'];
    delete copy['identificadoresExternos'];
    delete copy['praxisHash'];
    delete copy['praxisRecetas'];
    return copy as T;
}

// Las respuestas orientadas a la app no exponen los identificadores de integración
// (Praxis / prestación / registro). En su lugar exponen un estado neutral de
// publicación electrónica que la app usa para avisar y bloquear la dispensa privada.
export function toAppPrescription<T>(doc: T): T {
    return stripExternalFields(doc);
}

export function toAppPrescriptionList<T>(docs: T[]): T[] {
    return Array.isArray(docs) ? docs.map((doc) => stripExternalFields(doc)) : docs;
}
