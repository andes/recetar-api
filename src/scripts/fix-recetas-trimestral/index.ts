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
        FixRcetaTrimestral().then(() => {
            mongoose.disconnect();
        });
    });
};

async function FixRcetaTrimestral() {
    let migradas = 0;
    const andesPath = process.env.API_SNOMED || process.env.ANDES_ENDPOINT;
    // eslint-disable-next-line no-console
    console.log('>> INICIANDO PROCESO DE ACTUALIZACIÓN TRIMESTRAL...');

    try {
        const prescriptions: IPrescription[] = await Prescription.find(
            {
                ambito: 'publico',
                trimestral: true,
                'supplies.supply.snomedConcept.conceptId': {
                    $exists: false
                },
                date: { $gte: new Date('2026-06-24') }
            }
        );
        // eslint-disable-next-line no-console
        console.log(`>> CANTIDAD DE PRESCRIPCIONES TRIMESTRALES A PROCESAR: ${prescriptions.length}`);

        // Agrupar por paciente + medicamento + ventana de 5 min de createdAt
        const grouped = new Map<string, IPrescription[]>();
        for (const p of prescriptions) {
            if (!p.createdAt) {
                // eslint-disable-next-line no-console
                console.log(`ADVERTENCIA: Receta ${p._id} no tiene createdAt. Se agrupa con timeBucket 0.`);
            }
            const createdAt = p.createdAt ? new Date(p.createdAt).getTime() : 0;
            const timeBucket = Math.floor(createdAt / (5 * 60 * 1000));
            const key = `${p.patient.dni}||${p.supplies[0].supply.name}||${timeBucket}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(p);
        }

        // eslint-disable-next-line no-console
        console.log(`>> GRUPOS TRIMESTRALES ENCONTRADOS: ${grouped.size}`);
        // eslint-disable-next-line no-console
        console.log('>> COMENZANDO ACTUALIZACIÓN....');

        for (const [key, group] of grouped) {
            // Ordenar por fecha ascendente: 1ra, 2da, 3ra
            group.sort((a, b) => a.date.getTime() - b.date.getTime());
            const [first, ...rest] = group;

            // eslint-disable-next-line no-console
            console.log(`Procesando grupo ${key} con ${group.length} recetas. 1ra: ${first._id}`);

            // Si la 1ra está dispensada, skip del grupo entero
            if (first.status === 'Dispensada') {
                // eslint-disable-next-line no-console
                console.log(`La 1ra receta del grupo ${key} ya está dispensada. Se omite el grupo entero.`);
                continue;
            }

            try {
                const s = first.supplies[0].supply.name;
                const encodedSearch = encodeURIComponent(s);
                const resp = await needle('get', `${andesPath}/core/term/snomed?expression=<763158003:732943007=*,[0..0] 774159003=*, 763032000=*&search=${encodedSearch}`);
                if (!resp.body || !resp.body[0] || !resp.body[0].conceptId) {
                    // eslint-disable-next-line no-console
                    console.log(`No se encontró el concepto SNOMED para el medicamento: ${s} en la prescripción Id: ${first._id}`);
                    continue;
                }
                const supplies: ISnomedConcept = resp.body[0];
                first.supplies[0].supply.snomedConcept = supplies;

                const prof = await User.findOne({ _id: first.professional.userId });
                if (!prof) {
                    // eslint-disable-next-line no-console
                    console.log(`No se encontró el profesional con userId: ${first.professional.userId} para el grupo ${key}`);
                    continue;
                }
                if (prof.idAndes === undefined || prof.idAndes === null) {
                    // eslint-disable-next-line no-console
                    console.log(`El profesional con userId: ${first.professional.userId} no tiene idAndes definido para el grupo ${key}`);
                    continue;
                }

                const patient = first.patient;

                // Verificar si existe una receta en andes con el mismo medicamento y este vigente
                const conceptId = first.supplies[0].supply.snomedConcept?.conceptId;
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
                            console.log(`Receta ya vigente en ANDES para paciente ${patient.dni} y conceptId ${conceptId}. Se omite grupo.`);
                            continue;
                        }
                    } catch (verifyErr) {
                        // eslint-disable-next-line no-console
                        console.error(`Error al verificar receta existente en ANDES para paciente ${patient.dni}:`, verifyErr);
                    }
                }

                const sent = await createPrescriptionAndes(first, prof, patient);
                if (sent) {
                    // eslint-disable-next-line no-console
                    console.log(`1ra receta ${first._id} enviada a ANDES. Eliminando las ${group.length} del grupo...`);
                    migradas++;
                    const total = grouped.size;
                    const pct = Math.round((migradas / total) * 100);
                    const barLen = 30;
                    const filled = Math.round((migradas / total) * barLen);
                    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
                    // eslint-disable-next-line no-console
                    console.log(`[${bar}] ${migradas}/${total} grupos (${pct}%)`);
                    await Prescription.deleteOne({ _id: first._id });
                    for (const r of rest) {
                        await Prescription.deleteOne({ _id: r._id });
                    }
                } else {
                    // eslint-disable-next-line no-console
                    console.log(`Fallo el envío de la 1ra receta ${first._id}. No se elimina ninguna del grupo.`);
                }

            } catch (err) {
                // eslint-disable-next-line no-console
                console.log(`EL GRUPO ${key} NO PUDO SER ACTUALIZADO ` + err);
            }
        }

        // eslint-disable-next-line no-console
        console.log(`Grupos procesados: ${grouped.size}`);
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

    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error al enviar receta a ANDES');
        sendToAndes = false;
    }
    return sendToAndes;
};

initializeMongo();
