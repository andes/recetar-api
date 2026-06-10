import { Job } from 'agenda';
import User from '../../models/user.model';


async function testJob(job: Job): Promise<void> {
    const inicio = new Date();
    const { name } = job.attrs.data as {
        name: string;
    };
    // eslint-disable-next-line no-console
    console.log(`📬 Iniciando Job de test nombre: ${name}. ${inicio}`);

    const profesionales = await User.find({}, { password:0, refreshToken:0, authenticationToken:0 })
        .limit(5);
    if (profesionales.length > 0) {
        profesionales.forEach(profesional => {
            // eslint-disable-next-line no-console
            console.log(`- Profesional: ${profesional.businessName} - Email: ${profesional.email}`);
        });
    } else {
        // eslint-disable-next-line no-console
        console.log('⚠️ No se encontraron profesionales para listar.');
    }
    const fin = new Date();
    // eslint-disable-next-line no-console
    console.log(`✅ Job de test finalizado correctamente. ${fin} - Duración: ${fin.getTime() - inicio.getTime()} ms`);
};

export default testJob;
