import { PrescriptionRepository } from '../../modules/prescriptions/prescription.repository';
import { IPrescription } from '../../modules/prescriptions/prescription.types';
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
    const groups = groupPendingByTreatment(pendientes);

    for (const group of groups) {
        const current = group.reduce(
            (max, doc) => Math.max(max, doc.syncExterno?.praxis?.intentos ?? 0),
            0,
        );
        try {
            const payload = PraxisMapper.toPraxisFromDoc(group[0]);
            const response = await client.createPrescription(payload);
            await repository.savePraxisResponse(group, response, current + 1);
        } catch (error) {
            const intentos = current + 1;
            const estado = intentos >= maxAttempts ? 'error' : 'pendiente';
            for (const doc of group) {
                const previous = doc.syncExterno?.praxis;
                const plain = previous && typeof (previous as unknown as { toObject?: () => unknown }).toObject === 'function'
                    ? (previous as unknown as { toObject: () => Record<string, unknown> }).toObject()
                    : (previous || {});
                await repository.updateSyncExterno(doc._id.toString(), {
                    praxis: {
                        ...plain,
                        estado,
                        intentos,
                        ultimoError: (error as Error).message,
                    },
                });
            }
        }
    }
}

function groupPendingByTreatment(pendientes: IPrescription[]): IPrescription[][] {
    const groups = new Map<string, IPrescription[]>();
    for (const doc of pendientes) {
        const key = doc.treatmentGroupId || doc._id.toString();
        const group = groups.get(key) || [];
        group.push(doc);
        groups.set(key, group);
    }
    return Array.from(groups.values()).map(group =>
        group.sort((a, b) => (a.ordenTratamiento ?? 0) - (b.ordenTratamiento ?? 0)),
    );
}
