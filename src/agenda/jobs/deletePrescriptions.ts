import { Job } from 'agenda';
import Prescription from '../../models/prescription.model';
import moment = require('moment');

async function deletePrescriptions(job: Job) {
    const { days = 30 } = job.attrs.data || {};
    const limitDate = moment().subtract(days, 'days').toDate();

    try {
        const result = await Prescription.deleteMany({
            status: 'eliminada',
            $or: [
                { updatedAt: { $lt: limitDate } },
                { updatedAt: { $exists: false }, createdAt: { $lt: limitDate } },
                { updatedAt: { $exists: false }, createdAt: { $exists: false }, date: { $lt: limitDate } }
            ]
        });

        // eslint-disable-next-line no-console
        console.log(`[Job: delete-prescriptions] Se han eliminado físicamente ${result.deletedCount} recetas marcadas como 'Eliminada' antes de ${limitDate}`);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Job: delete-prescriptions] Error al eliminar las recetas:', error);
        return job.fail(`Error en el trabajo delete-prescriptions: ${error}`);
    }
}

export default deletePrescriptions;
