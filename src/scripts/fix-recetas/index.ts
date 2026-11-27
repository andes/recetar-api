import mongoose from 'mongoose';
import { env } from '../../config/config';
// interface
import needle from 'needle';
import axios from 'axios';
import Prescription from '../../models/prescription.model';
import User from '../../models/user.model';
import IPrescription from '../../interfaces/prescription.interface';
import IUser from '../../interfaces/user.interface';
import IPatient from '../../interfaces/patient.interface';
import { ISnomedConcept } from '../../interfaces/supply.interface';

// init db connections
const initializeMongo = (): void => {
    const MONGO_URI = `${(process.env.MONGODB_URI || env.MONGODB_CONNECTION)}`;
    mongoose.Promise = Promise;
    mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: false
    }).then(() => {
        // eslint-disable-next-line no-console
        console.log('DB is connected');
        FixRceta().then(() => {
            mongoose.disconnect();
        });
    });
};

async function FixRceta() {
    const andesPath = process.env.API_SNOMED || process.env.ANDES_ENDPOINT;
    let migradas = 0;
    // eslint-disable-next-line no-console
    console.log('>> INICIANDO PROCESO DE ACTUALIZACIÓN...');

    try {
        const prescription: IPrescription[] = await Prescription.find(
            {
                ambito: 'publico',
                'supplies.supply.snomedConcept.conceptId': {
                    $exists: false
                },
                status: 'Pendiente',
                trimestral: false,
                date: { $gte: new Date('2026-06-24') }
            }
        );
        // eslint-disable-next-line no-console
        console.log(`>> CANTIDAD DE PRESCRIPCIONES A ACTUALIZAR EN BASE DE DATOS: ${prescription.length}`);
        // eslint-disable-next-line no-console
        console.log('>> COMENZANDO ACTUALIZACIÓN....');

        for (const p of prescription) {
            // eslint-disable-next-line no-console
            console.log('Procesando prescripción Id: ' + p._id);
            try {
                const s = p.supplies[0].supply.name;
                const encodedSearch = encodeURIComponent(s);
                const resp = await needle('get', `${andesPath}/core/term/snomed?expression=<763158003:732943007=*,[0..0] 774159003=*, 763032000=*&search=${encodedSearch}`);
                if (!resp.body || !resp.body[0] || !resp.body[0].conceptId) {
                    // eslint-disable-next-line no-console
                    console.log(`No se encontró el concepto SNOMED para el medicamento: ${s} en la prescripción Id: ${p._id}`);
                    continue;
                }
                const supplies: ISnomedConcept = resp.body[0];
                p.supplies[0].supply.snomedConcept = supplies;

                const prof = await User.findOne({ _id: p.professional.userId });
                if (!prof) {
                    // eslint-disable-next-line no-console
                    console.log(`No se encontró el profesional con userId: ${p.professional.userId}`);
                    continue;
                }
                if (prof.idAndes === undefined || prof.idAndes === null) {
                    // eslint-disable-next-line no-console
                    console.log(`El profesional con userId: ${prof._id} no tiene idAndes definido`);
                    continue;
                }

                const patient = p.patient;

                // Verificar si existe una receta en andes con el mismo medicamento y este vigente
                const conceptId = p.supplies[0].supply.snomedConcept?.conceptId;
                if (conceptId && patient.dni) {
                    try {
                        const verifyResponse = await axios.get(`${process.env.ANDES_ENDPOINT}/modules/recetas/verificar`, {
                            params: {
                                documento: patient.dni,
                                conceptId,
                                sexo: patient.sex.toLowerCase()
                            },
                            headers: { Authorization: process.env.JWT_MPI_TOKEN || '' }
                        });
                        if (verifyResponse.data?.existe) {
                            // eslint-disable-next-line no-console
                            console.log(`Receta ya vigente en ANDES para paciente ${patient.dni} y conceptId ${conceptId}. Se omite.`);
                            continue;
                        }
                    } catch (verifyErr) {
                        // eslint-disable-next-line no-console
                        console.error(`Error al verificar receta existente en ANDES para paciente ${patient.dni}:`, verifyErr);
                    }
                }

                const sent = await createPrescriptionAndes(p, prof, patient);
                if (sent) {
                    await Prescription.deleteOne({ _id: p._id });
                    // eslint-disable-next-line no-console
                    console.log(`Receta ${p._id} enviada a ANDES y eliminada de recetar.`);
                    migradas++;
                    const total = prescription.length;
                    const pct = Math.round((migradas / total) * 100);
                    const barLen = 30;
                    const filled = Math.round((migradas / total) * barLen);
                    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
                    // eslint-disable-next-line no-console
                    console.log(`[${bar}] ${migradas}/${total} (${pct}%)`);
                }

            } catch (err) {
                // eslint-disable-next-line no-console
                console.log(`LA PRESCRIPCIÓN CON ID ${p._id} NO PUDO SER ACTUALIZADA ` + err);
            }
        }

        // eslint-disable-next-line no-console
        console.log(`Recetas migradas: ${migradas}`);
        // eslint-disable-next-line no-console
        console.log('>> FIN PROCESO =====================');
    } catch (err) {
        // eslint-disable-next-line no-console
        console.log('OCURRIÓ UN ERROR');
        // eslint-disable-next-line no-console
        console.log(err);
    }
};

const createPrescriptionAndes = async (newPrescription: IPrescription, profesional: IUser, patient: IPatient) => {
    const prescriptionAndes = {
        idPrestacion: newPrescription._id.toString(),
        idRegistro: newPrescription._id.toString(),
        fechaRegistro: newPrescription.date.toISOString(),
        paciente: {
            id: patient.idMPI,
            nombre: patient.firstName,
            apellido: patient.lastName,
            documento: patient.dni ? patient.dni : '',
            sexo: patient.sex.toLowerCase(),
            obraSocial: patient.obraSocial || null,
        },
        profesional: {
            id: profesional?.idAndes ? profesional.idAndes : '',
        },
        organizacion: {
            id: newPrescription.organizacion?._id || null,
            nombre: newPrescription.organizacion?.nombre || 'Recetar',
            direccion: newPrescription.organizacion?.direccion || null,
        },
        medicamento: {
            diagnostico: newPrescription.supplies[0].diagnostic || 'Sin diagnóstico',
            concepto: newPrescription.supplies[0].supply.snomedConcept || (newPrescription.supplies[0].supply as any).concepto,
            presentacion: '',
            unidades: '',
            cantidad: newPrescription.supplies[0].quantityPresentation ? newPrescription.supplies[0].quantityPresentation : 1,
            cantEnvases: newPrescription.supplies[0].quantity || 1,
            dosisDiaria: {
                dosis: null,
                dias: null,
                notaMedica: (newPrescription.supplies[0].indication || '') + (newPrescription.supplies[0].supply.specification ? ` - Especificación: ${newPrescription.supplies[0].supply.specification}` : '')
            },
            tratamientoProlongado: newPrescription.trimestral ? true : false,
            tiempoTratamiento: !newPrescription.trimestral ? null : { id: '3', nombre: '3 meses' },
            tipoReceta: newPrescription.supplies[0].triplicate ? 'triplicado' : (newPrescription.supplies[0].duplicate ? 'duplicado' : 'simple'),
            serie: newPrescription.supplies[0].triplicateData?.serie ? newPrescription.supplies[0].triplicateData?.serie.toString() : '',
            numero: newPrescription.supplies[0].triplicateData?.numero ? newPrescription.supplies[0].triplicateData?.numero.toString() : ''
        },
        origenExterno: {
            id: newPrescription._id.toString(),
            nombre: 'RecetAr',
            fecha: newPrescription.date.toString()
        }
    };
    let sendToAndes = false;
    try {
        const payload = JSON.parse(JSON.stringify(prescriptionAndes));
        const Authorization = process.env.JWT_MPI_TOKEN || '';
        const respAndes = await axios.post(`${process.env.ANDES_ENDPOINT}/modules/recetas`,
            payload,
            { headers: { Authorization } });
        if ((respAndes.status === 200 || respAndes.status === 201)
            && respAndes.data
            && !respAndes.data.status
            && !respAndes.data.errors
            && !respAndes.data.name) {
            sendToAndes = true;
        }
        // eslint-disable-next-line no-console
        console.log(`Receta ${newPrescription._id} enviada a ANDES con status: ${respAndes.status}`);

    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error al enviar receta a ANDES');
        sendToAndes = false;
    }
    return sendToAndes;
};

initializeMongo();
