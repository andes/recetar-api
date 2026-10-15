import { PrescriptionRepository } from '../../modules/prescriptions/prescription.repository';
import { PraxisClient, PraxisMapper, PraxisNotEligibleError, PraxisResponseError } from '../../integrations/praxis';
import { env } from '../../config/config';
import { PraxisReceta } from '../../modules/prescriptions/prescription.types';

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
            const praxisId = String(response.idPrescripcion);
            const praxisRecetas: PraxisReceta[] = (response.recetasEmitidas || []).map((receta) => ({
                idReceta: String(receta.idReceta),
                numeroReceta: receta.numeroReceta,
                hash: receta.hash,
            }));

            await repository.addExternalIdentifier(doc._id.toString(), 'praxis', praxisId);
            await repository.update(doc._id.toString(), {
                praxisHash: response.hash,
                praxisRecetas,
            });
            await repository.updateSyncExterno(doc._id.toString(), {
                praxis: { estado: 'ok', intentos: current + 1 },
            });
        } catch (error) {
            const notEligible = error instanceof PraxisNotEligibleError;
            const intentos = notEligible ? current : current + 1;
            const estado = notEligible
                ? 'no_aplicable'
                : (intentos >= maxAttempts ? 'error' : 'pendiente');

            await repository.updateSyncExterno(doc._id.toString(), {
                praxis: {
                    estado,
                    intentos,
                    ultimoError: (error as Error).message,
                    codigo: error instanceof PraxisResponseError ? error.codigo : undefined,
                },
            });
        }
    }
}
