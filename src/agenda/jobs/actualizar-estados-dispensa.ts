import { PrescriptionRepository } from '../../modules/prescriptions/prescription.repository';

export interface DispensaSyncDeps {
    repository?: PrescriptionRepository;
}

export interface DispensaSyncResult {
    reconciliadas: number;
}

// Reconcilia recetas con dispensa parcial: si la cantidad dispensada acumulada
// ya cubre la cantidad indicada, las marca como dispensadas.
export async function runActualizarEstadosDispensa(deps: DispensaSyncDeps = {}): Promise<DispensaSyncResult> {
    const repository = deps.repository ?? new PrescriptionRepository();
    const parciales = await repository.findDispensaParcial();

    let reconciliadas = 0;
    for (const doc of parciales) {
        const requerida = doc.supplies?.[0]?.quantity || 0;
        const dispensada = (doc.dispensa || []).reduce((sum, d) => sum + (d.cantidad || 0), 0);

        if (requerida > 0 && dispensada >= requerida) {
            await repository.pushEstado(doc._id.toString(), { tipo: 'finalizada', fecha: new Date() }, 'Dispensada');
            await repository.pushDispensa(doc._id.toString(), { tipo: 'dispensada', fecha: new Date() }, null, 'Dispensada');
            reconciliadas++;
        }
    }

    return { reconciliadas };
}
