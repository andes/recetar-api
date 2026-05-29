import mongoose from 'mongoose';
import { env } from '../../config/config';
// interface
import { PatientClass } from './patient.class';
import IPatient from '../../interfaces/patient.interface';
import needle from 'needle';
import Patient from '../../models/patient.model';

// init db connections
const initializeMongo = (): void => {
    const MONGO_URI = `${(process.env.MONGODB_URI || env.MONGODB_CONNECTION)}`;
    mongoose.Promise = Promise;
    mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: false
    }).then(connection => {
        // eslint-disable-next-line no-console
        console.log('DB is connected');
        patientMigration().then(() => {
            connection.disconnect();
        });
    });
};

async function patientMigration() {

    // eslint-disable-next-line no-console
    console.log('>> INICIANDO PROCESO DE ACTUALIZACIÓN...');

    const patientClass = new PatientClass();

    try {
        const patients: IPatient[] = await patientClass.getPatients();

        // eslint-disable-next-line no-console
        console.log(`>> CANTIDAD DE PACIENTES EN BASE DE DATOS: ${patients.length}`);
        // eslint-disable-next-line no-console
        console.log('>> COMENZANDO ACTUALIZACIÓN....');

        let nroPacientes = 0;
        for (const p of patients) {
            if (!p.idMPI) {
                try {
                    const sexo = p.sex[0].toLowerCase + p.sex.substring(1);
                    const resp = await needle('get', `${process.env.ANDES_MPI_ENDPOINT}?search=${p.dni}&activo=true&estado=validado&sexo=${sexo}`, { headers: { Authorization: process.env.JWT_MPI_TOKEN } });
                    if (resp.body[0]) {
                        const { id, nombre, apellido, genero, alias, numeroIdentificacion, tipoIdentificacion } = resp.body[0];
                        const rp = await Patient.updateOne({ _id: p.id }, {
                            idMPI: id,
                            firstName: nombre,
                            lastName: apellido,
                            genero,
                            nombreAutopercibido: alias,
                            nroDocumentoExtranjero: numeroIdentificacion,
                            tipoDocumentoExtranjero: tipoIdentificacion,
                        });
                        if (rp.nModified) {
                            nroPacientes += 1;
                        }
                    }
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.log(`EL PACIENTE CON DNI ${p.dni} NO PUDO SER ACTUALIZADO ` + err);
                }
            }
        }
        // eslint-disable-next-line no-console
        console.log(`Pacientes actualizados: ${nroPacientes}`);
        // eslint-disable-next-line no-console
        console.log('>> FIN PROCESO =====================');
    } catch (err) {
        // eslint-disable-next-line no-console
        console.log('OCURRIÓ UN ERROR');
        // eslint-disable-next-line no-console
        console.log(err);
    }
}

initializeMongo();
