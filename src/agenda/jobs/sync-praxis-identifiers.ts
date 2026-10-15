import { PrescriptionRepository } from '../../modules/prescriptions/prescription.repository';
import { PraxisClient, PraxisMapper } from '../../integrations/praxis';
import { env } from '../../config/config';

const MAX_ATTEMPTS = 3;
const BATCH_LIMIT = 100;

export interface PraxisSyncDeps {
    repository?: PrescriptionRepository;
    client?: PraxisClient;
    maxAttempts?: number;
    limit?: number;
}

export async function runPraxisSync(deps: PraxisSyncDeps = {}): Promise<void> {
    const repository = deps.repository ?? new PrescriptionRepository();
    const client = deps.client ?? new PraxisClient({
        praxisEndpoint: env.PRAXYS_ENDPOINT,
        praxisApiKey: env.PRAXYS_API_KEY,
    });
    const maxAttempts = deps.maxAttempts ?? MAX_ATTEMPTS;
    const limit = deps.limit ?? BATCH_LIMIT;

    const pendientes = await repository.findPendingPraxisSync(limit);

    for (const doc of pendientes) {
        const current = doc.syncExterno?.praxis?.intentos ?? 0;
        try {
            const payload = PraxisMapper.toPraxisFromDoc(doc);
            const response = await client.createPrescription(payload);
            await repository.addExternalIdentifier(doc._id.toString(), 'praxis', response.idPrescripcion);
            await repository.updateSyncExterno(doc._id.toString(), {
                praxis: { estado: 'ok', intentos: current + 1 },
            });
        } catch (error) {
            const intentos = current + 1;
            const estado = intentos >= maxAttempts ? 'error' : 'pendiente';
            await repository.updateSyncExterno(doc._id.toString(), {
                praxis: { estado, intentos, ultimoError: (error as Error).message },
            });
        }
    }
}
