import mongoose from 'mongoose';
import { initializeMongo } from '../src/database/dbconfig';
import Prescription from '../src/modules/prescriptions/prescription.model';
import User from '../src/models/user.model';
import { normalizeCuil } from '../src/modules/prescriptions/prescription.utils';

interface PendingPrescription {
    _id: mongoose.Types.ObjectId;
    dispensedBy?: { userId?: mongoose.Types.ObjectId };
}

interface BackfillOperation {
    updateOne: {
        filter: { _id: mongoose.Types.ObjectId };
        update: { $set: { 'dispensedBy.cuil': string } };
    };
}

async function resolveCuil(userId: string, cache: Map<string, string>): Promise<string> {
    if (cache.has(userId)) { return cache.get(userId) as string; }
    const user = await User.findById(userId)
        .select('cuil username')
        .lean()
        .exec() as { cuil?: string; username?: string } | null;
    const cuil = normalizeCuil(user?.cuil);
    const rawUsername = user?.username || '';
    const fromUsername = /^[\d-]+$/.test(rawUsername) ? normalizeCuil(rawUsername) : '';
    const value = cuil || fromUsername;
    cache.set(userId, value);
    return value;
}

async function main(): Promise<void> {
    await initializeMongo();

    const pending = await Prescription.find({
        status: 'Dispensada',
        'dispensedBy.userId': { $exists: true },
        $or: [
            { 'dispensedBy.cuil': { $exists: false } },
            { 'dispensedBy.cuil': null },
            { 'dispensedBy.cuil': '' },
        ],
    }).select('_id dispensedBy.userId').lean().exec() as unknown as PendingPrescription[];

    // eslint-disable-next-line no-console
    console.log(`Recetas dispensadas sin cuil: ${pending.length}`);

    const cache = new Map<string, string>();
    const operations: BackfillOperation[] = [];

    for (const item of pending) {
        const userId = item.dispensedBy?.userId?.toString();
        if (!userId) { continue; }
        const cuil = await resolveCuil(userId, cache);
        if (!cuil) { continue; }
        operations.push({
            updateOne: {
                filter: { _id: item._id },
                update: { $set: { 'dispensedBy.cuil': cuil } },
            },
        });
    }

    if (!operations.length) {
        // eslint-disable-next-line no-console
        console.log('No hay recetas para actualizar.');
        await mongoose.disconnect();
        return;
    }

    const result = await Prescription.bulkWrite(operations);
    // eslint-disable-next-line no-console
    console.log(`Recetas actualizadas: ${result.modifiedCount}`);
    await mongoose.disconnect();
}

main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Error en backfill:', error);
    process.exit(1);
});
