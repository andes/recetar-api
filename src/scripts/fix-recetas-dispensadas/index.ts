import mongoose from 'mongoose';
import { env } from '../../config/config';
import needle from 'needle';
import axios from 'axios';
import Prescription from '../../models/prescription.model';
import User from '../../models/user.model';
import IPrescription from '../../interfaces/prescription.interface';
import IUser from '../../interfaces/user.interface';
import { ISnomedConcept } from '../../interfaces/supply.interface';

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
        FixRcetaDispensadas().then(() => {
            mongoose.disconnect();
        });
    });
};

async function FixRcetaDispensadas() {
    const andesPath = process.env.API_SNOMED || process.env.ANDES_ENDPOINT;
    let corregidas = 0;
    // eslint-disable-next-line no-console
    console.log('>> INICIANDO PROCESO DE CORRECCIÓN DE RECETAS DISPENSADAS...');

    try {
        const prescriptions: IPrescription[] = await Prescription.find(
            {
                ambito: 'publico',
                trimestral: true,
                status: 'Dispensada',
                'supplies.supply.snomedConcept.conceptId': {
                    $exists: false
                },
                createdAt: { $gte: new Date('2026-06-24') }
            }
        );
        // eslint-disable-next-line no-console
        console.log(`>> CANTIDAD DE RECETAS DISPENSADAS A CORREGIR: ${prescriptions.length}`);
        // eslint-disable-next-line no-console
        console.log('>> COMENZANDO CORRECCIÓN....');

        for (const p of prescriptions) {
            // eslint-disable-next-line no-console
            console.log(`Procesando receta dispensada Id: ${p._id}`);
            try {
                // 1. SNOMED lookup
                const s = p.supplies[0].supply.name;
                const encodedSearch = encodeURIComponent(s);
                const resp = await needle('get', `${andesPath}/core/term/snomed?expression=<763158003:732943007=*,[0..0] 774159003=*, 763032000=*&search=${encodedSearch}`);
                if (!resp.body || !resp.body[0] || !resp.body[0].conceptId) {
                    // eslint-disable-next-line no-console
                    console.log(`No se encontró el concepto SNOMED para el medicamento: ${s} en la receta Id: ${p._id}`);
                    continue;
                }
                const supplies: ISnomedConcept = resp.body[0];
                p.supplies[0].supply.snomedConcept = supplies;
                const conceptId = supplies.conceptId;

                const patient = p.patient;

                // 2. Validar DNI
                if (!patient.dni) {
                    // eslint-disable-next-line no-console
                    console.log(`Receta ${p._id} no tiene DNI de paciente. Se omite.`);
                    continue;
                }

                // 3. Buscar receta en Andes (todos los estados)
                let andesReceta: any = null;
                try {
                    const andesUrl = `${process.env.ANDES_ENDPOINT}/modules/recetas/filtros?documento=${patient.dni}&sexo=${patient.sex.toLowerCase()}&estado=todas`;
                    const andesResp = await axios.get(andesUrl, {
                        headers: { Authorization: process.env.JWT_MPI_TOKEN || '' }
                    });
                    andesReceta = (andesResp.data || []).find(
                        (ap: any) => ap.medicamento?.concepto?.conceptId === conceptId
                            && ap.origenExterno?.nombre === 'RecetAr'
                            && ap.medicamento?.tratamientoProlongado === true
                    );
                    if (!andesReceta) {
                        // eslint-disable-next-line no-console
                        console.log(`No se encontró receta en Andes para paciente ${patient.dni} y conceptId ${conceptId}. Se guarda conceptId y se omite.`);
                        await p.save();
                        continue;
                    }
                } catch (andesErr) {
                    // eslint-disable-next-line no-console
                    console.error(`Error al buscar receta en Andes para paciente ${patient.dni}:`, andesErr);
                    continue;
                }

                const andesRecetaId = andesReceta._id || andesReceta.id;
                const estadoActual = andesReceta.estadoActual?.tipo;

                // 4. Suspender en Andes si está vigente
                if (estadoActual === 'vigente') {
                    const prof = await User.findOne({ _id: p.professional.userId });
                    if (!prof) {
                        // eslint-disable-next-line no-console
                        console.log(`No se encontró el profesional con userId: ${p.professional.userId}. Se omite.`);
                        continue;
                    }
                    const profesionalAndes = {
                        id: prof.idAndes || '',
                        nombre: prof.businessName ? prof.businessName.split(',')[1]?.trim() || '' : '',
                        apellido: prof.businessName ? prof.businessName.split(',')[0]?.trim() || '' : '',
                        cuil: prof.cuil || '',
                        matricula: prof.enrollment || '',
                        documento: prof.username || '',
                    };
                    try {
                        await axios.patch(`${process.env.ANDES_ENDPOINT}/modules/recetas`,
                            {
                                op: 'suspender',
                                recetaId: andesRecetaId,
                                motivo: 'correccion desde RecetAr - primera receta dispensada',
                                observacion: 'correccion desde RecetAr - primera receta dispensada',
                                profesional: profesionalAndes,
                                fecha: new Date()
                            },
                            {
                                headers: {
                                    Authorization: process.env.JWT_MPI_TOKEN || '',
                                    'Content-Type': 'application/json'
                                }
                            });
                        // eslint-disable-next-line no-console
                        console.log(`Receta suspendida en Andes: ${andesRecetaId}`);
                    } catch (suspendErr) {
                        // eslint-disable-next-line no-console
                        console.error(`Error al suspender receta en Andes ${andesRecetaId}. Se omite recreación:`, suspendErr);
                        continue;
                    }
                } else if (estadoActual === 'suspendida') {
                    // eslint-disable-next-line no-console
                    console.log(`Receta en Andes ${andesRecetaId} ya estaba suspendida. Solo se recrean 2da y 3ra.`);
                } else {
                    // eslint-disable-next-line no-console
                    console.log(`Receta en Andes ${andesRecetaId} con estado "${estadoActual}". Se guarda conceptId y se omite.`);
                    await p.save();
                    continue;
                }

                // 5. Recrear 2da y 3ra en recetar
                const date2 = new Date(p.date);
                date2.setDate(date2.getDate() + 30);
                const date3 = new Date(p.date);
                date3.setDate(date3.getDate() + 60);

                const baseData = {
                    patient: JSON.parse(JSON.stringify(p.patient)),
                    professional: JSON.parse(JSON.stringify(p.professional)),
                    supplies: JSON.parse(JSON.stringify(p.supplies)),
                    ambito: p.ambito,
                    trimestral: true,
                    organizacion: p.organizacion ? JSON.parse(JSON.stringify(p.organizacion)) : undefined,
                    obraSocial: p.obraSocial,
                    status: 'Pendiente',
                };

                const newR2 = new Prescription({
                    ...baseData,
                    date: date2,
                });
                const saved2 = await newR2.save();
                // eslint-disable-next-line no-console
                console.log(`Recreada 2da receta: ${saved2._id} (date: ${date2.toISOString()})`);

                const newR3 = new Prescription({
                    ...baseData,
                    date: date3,
                });
                const saved3 = await newR3.save();
                // eslint-disable-next-line no-console
                console.log(`Recreada 3ra receta: ${saved3._id} (date: ${date3.toISOString()})`);

                // Guardar conceptId en la receta original (solo si todo salió bien)
                await p.save();
                // eslint-disable-next-line no-console
                console.log(`ConceptId ${conceptId} guardado en receta dispensada ${p._id}`);

                // 6. Barra de progreso
                corregidas++;
                const total = prescriptions.length;
                const pct = Math.round((corregidas / total) * 100);
                const barLen = 30;
                const filled = Math.round((corregidas / total) * barLen);
                const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
                // eslint-disable-next-line no-console
                console.log(`[${bar}] ${corregidas}/${total} (${pct}%)`);

            } catch (err) {
                // eslint-disable-next-line no-console
                console.log(`LA RECETA DISPENSADA CON ID ${p._id} NO PUDO SER CORREGIDA ` + err);
            }
        }

        // eslint-disable-next-line no-console
        console.log(`Recetas dispensadas corregidas: ${corregidas}`);
        // eslint-disable-next-line no-console
        console.log('>> FIN PROCESO =====================');
    } catch (err) {
        // eslint-disable-next-line no-console
        console.log('OCURRIÓ UN ERROR');
        // eslint-disable-next-line no-console
        console.log(err);
    }
};

initializeMongo();
