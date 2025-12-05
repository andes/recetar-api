import { Job } from 'agenda';
import axios from 'axios';
import Prescription from '../../models/prescription.model';
import IPrescription from '../../interfaces/prescription.interface';
import IPrescriptionAndes from '../../interfaces/prescriptionAndes.interface';


async function sendPrescriptions(job: Job) {
    const errores = [];
    try {
        const recetasPublicasPendientes = await Prescription.find({ status: 'pendiente', ambito: 'publico' });
        if (recetasPublicasPendientes.length === 0) {
            return;
        } else {
            recetasPublicasPendientes.forEach(async (receta: IPrescription) => {
                const payload = JSON.parse(JSON.stringify(receta));
                // Adapt receta a formato Andes
                const Authorization = process.env.JWT_MPI_TOKEN || '';
                const respAndes = await axios.post(`${process.env.ANDES_ENDPOINT}/modules/recetas`,
                    payload,
                    { headers: { Authorization } });
                if (respAndes.statusText === 'OK') {
                    await Prescription.findByIdAndDelete(receta._id);
                } else {
                    errores.push(`Error enviando receta ID ${receta._id} a Andes. Código de estado: ${respAndes.status}. Mensaje: ${respAndes.data.message}`);
                }
            });
        }
        if (errores.length > 0) {
            throw new Error(`Recetas con errores: ${errores.length}`);
        }
    } catch (error) {
        errores.push(error);
        return job.fail(`Error en el job de envío de recetas a Andes: ${errores}`);
    }
}

export default sendPrescriptions;
