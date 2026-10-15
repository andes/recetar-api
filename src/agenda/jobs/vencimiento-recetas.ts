import { PrescriptionRepository } from '../../modules/prescriptions/prescription.repository';

const DEFAULT_DIAS_LIMITE = 30;

export interface VencimientoDeps {
    repository?: PrescriptionRepository;
    diasLimite?: number;
}

export interface VencimientoResult {
    aVigentes: number;
    aVencidas: number;
}

export async function runVencimientoRecetas(deps: VencimientoDeps = {}): Promise<VencimientoResult> {
    const repository = deps.repository ?? new PrescriptionRepository();
    const diasLimite = deps.diasLimite ?? DEFAULT_DIAS_LIMITE;

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const fechaFinVigentes = new Date(startOfDay);
    fechaFinVigentes.setDate(fechaFinVigentes.getDate() - diasLimite);

    const fechaFinPendientes = new Date(now);
    fechaFinPendientes.setDate(fechaFinPendientes.getDate() + 1);
    fechaFinPendientes.setHours(23, 59, 59, 999);

    const fechaInicioPendientes = new Date(now);
    fechaInicioPendientes.setMonth(fechaInicioPendientes.getMonth() - 3);

    let aVigentes = 0;
    let aVencidas = 0;

    const pendientes = await repository.findPendientesEnRango(fechaInicioPendientes, fechaFinPendientes);
    for (const doc of pendientes) {
        await repository.pushEstado(doc._id.toString(), { tipo: 'vigente', fecha: now }, doc.status);
        aVigentes++;
    }

    const vencibles = await repository.findVencibles(fechaFinVigentes);
    for (const doc of vencibles) {
        await repository.pushEstado(doc._id.toString(), { tipo: 'vencida', fecha: now }, 'Vencida');
        aVencidas++;
    }

    return { aVigentes, aVencidas };
}
