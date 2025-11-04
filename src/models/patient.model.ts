import { Schema, Model, model } from 'mongoose';
import IPatient from '../interfaces/patient.interface';
import needle from 'needle';
import { obraSocialSchema } from './obraSocial.model';
import axios from 'axios';

// Schema
export const patientSchema = new Schema({
    dni: {
        type: String,
    },
    lastName: {
        type: String,
        required: '{PATH} is required'
    },
    firstName: {
        type: String,
        required: '{PATH} is required'
    },
    sex: {
        type: String,
        enum: ['Femenino', 'Masculino', 'Otro'],
        required: '{PATH} is required'
    },
    status: {
        type: String,
        enum: ['Validado', 'Temporal'],
    },
    genero: {
        type: String
    },
    nombreAutopercibido: {
        type: String,
        default: ''
    },
    idMPI: {
        type: String,
        default: ''
    },
    tipoDocumentoExtranjero: {
        type: String,
        default: ''
    },
    nroDocumentoExtranjero: {
        type: String,
        default: '',
    },
    obraSocial: {
        type: obraSocialSchema,
        default: null
    },
    estado: {
        type: String,
        enum: ['validado', 'temporal', 'recienNacido', 'extranjero', null],
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date,
    fechaNac: {
        type: Date,
        default: null
    },
    idLocalInMPI: {
        type: Boolean,
        default: false
    }
});

// Model
const Patient: Model<IPatient> = model<IPatient>('Patient', patientSchema);

// Buscar paciente en MPI de Andes
const searchPatientInAndesMPI = async (dni: string, sexo: string): Promise<any[]> => {
    try {
        const url = `${process.env.ANDES_MPI_ENDPOINT}?search=${dni}&sexo=${sexo}&activo=true`;
        const Authorization = process.env.JWT_MPI_TOKEN || '';

        const resp = await needle('get', url, { headers: { Authorization } });

        if (resp.statusCode !== 200) {
            throw new Error(`Error al buscar paciente en Andes MPI: ${resp.statusCode}`);
        }

        return resp.body || [];
    } catch (error) {
        throw new Error('Error al buscar paciente en Andes MPI');
    }
};


// Crear paciente en Andes MPI
const createPatientInAndesMPI = async (patient: IPatient, ignoreSuggestions = false): Promise<any> => {
    try {
        const Authorization = process.env.JWT_MPI_TOKEN || '';
        const response = await axios.post(`${process.env.ANDES_MPI_ENDPOINT}`, {
            nombre: patient.firstName,
            apellido: patient.lastName,
            documento: patient.dni,
            sexo: patient.sex.toLowerCase(),
            genero: patient.sex.toLowerCase(),
            fechaNacimiento: patient.fechaNac,
            ignoreSuggestions,
            estado: 'temporal'
        }, { headers: { Authorization } });

        if (response.status !== 200) {
            throw new Error(`Error al crear paciente en Andes MPI: ${response.status}`);
        }

        return response.data;
    } catch (error) {
        throw new Error('Error al crear paciente en Andes MPI');
    }
};

// Convertir datos de Andes MPI a formato local
const mapAndesPatientToLocal = (andesPatient: any): Partial<IPatient> => {
    return {
        dni: andesPatient.documento,
        firstName: andesPatient.nombre,
        lastName: andesPatient.apellido,
        fechaNac: andesPatient.fechaNacimiento ? new Date(andesPatient.fechaNacimiento) : undefined,
        sex: andesPatient.sexo[0].toUpperCase() + andesPatient.sexo.substr(1).toLowerCase(),
        status: andesPatient.estado[0].toUpperCase() + andesPatient.estado.substr(1).toLowerCase(),
        genero: andesPatient.genero,
        nombreAutopercibido: andesPatient.alias || '',
        idMPI: andesPatient.id || andesPatient._id,
        tipoDocumentoExtranjero: andesPatient.tipoIdentificacion || '',
        nroDocumentoExtranjero: andesPatient.numeroIdentificacion || '',
        estado: andesPatient.estado
    };
};

// Actualizar paciente local con datos de MPI
const updateLocalPatientWithMPIData = async (localPatient: IPatient, mpiPatients: any[]): Promise<IPatient> => {
    const matchingMPIPatient = mpiPatients.find((item: any) =>
        item.sexo === localPatient.sex.toLowerCase()
    );

    if (matchingMPIPatient) {
        const updatedData = mapAndesPatientToLocal(matchingMPIPatient);
        await Patient.updateOne({ _id: localPatient._id }, updatedData);
        return await Patient.findById(localPatient._id) as IPatient;
    }

    return localPatient;
};

// Crear paciente cuando no existe localmente ni en MPI (ámbito público)
const createPatientForPublicScope = async (patientParam: IPatient): Promise<IPatient> => {
    try {
        // Primero crea el paciente, puede traer sugerencias por similitudes
        const cotaMaxima = 0.95;
        const responseAndes = await createPatientInAndesMPI(patientParam, false);
        let patientData: any;
        if (!responseAndes?.sugeridos) {
            patientData = responseAndes;

        } else {
            const suggestions = responseAndes.sugeridos || [];
            // Filtrar pacientes con _score >= 0.95 (mismo paciente)
            const highScorePatients = suggestions.filter((item: any) => item._score >= cotaMaxima);

            let selectedPatient: any = null;

            if (highScorePatients.length > 0) {
                // Priorizar pacientes con estado 'validado' primero, si no hay entonces 'temporal'
                // Si no hay ninguno con estado específico, tomar el primero con alto score (no pasa en andes, siempre tienen estado)
                const validado = highScorePatients.find((item: any) => item.paciente?.estado === 'validado');
                const temporal = highScorePatients.find((item: any) => item.paciente?.estado === 'temporal');
                selectedPatient = validado || temporal || highScorePatients[0];
            }

            if (selectedPatient) {
                // Usar paciente sugerido seleccionado (usar los datos del paciente anidado)
                patientData = selectedPatient.paciente;
            } else {
                // Crear nuevo paciente en Andes MPI (esto devuelve un objeto, no un array)
                patientData = await createPatientInAndesMPI(patientParam, true);
            }
        }
        // Convertir a formato local y guardar
        const localPatientData = mapAndesPatientToLocal(patientData);
        const newPatient = new Patient(localPatientData);
        await newPatient.save();
        updateAndes(newPatient);

        return newPatient;
    } catch (error) {
        throw new Error('Error al crear paciente para ámbito público');
    }
};

// Actualizar paciente en andes (id de recetar en arreglo de identificadores)
const updateAndes = async (patient: IPatient): Promise<boolean> => {
    try {
        let patientUpdated = false;
        const respPatientMPI = await axios.get(`${process.env.ANDES_MPI_ENDPOINT}/${patient.idMPI}`, {
            headers: { Authorization: process.env.JWT_MPI_TOKEN || '' }
        });
        if (respPatientMPI.status !== 200) {
            throw new Error('Paciente no encontrado en Andes MPI');
        }
        const patientMPI = respPatientMPI.data;
        const encontradoMPI = patientMPI.identificadores?.some((id: any) => id.entidad === 'recetar' && id.valor === patient._id.toString());
        if (encontradoMPI) {
            // Ya tiene el ID de Recetar, no es necesario actualizar
            patientUpdated = true;
        } else {

            if (!patientMPI.identificadores) {
                patientMPI.identificadores = [];
            }
            patientMPI.identificadores.push({
                entidad: 'recetar',
                valor: patient._id.toString()
            });

            const resp = await axios.patch(`${process.env.ANDES_MPI_ENDPOINT}/${patient.idMPI}`, patientMPI, {
                headers: { Authorization: process.env.JWT_MPI_TOKEN || '' }
            });
            if (resp.status === 200) {
                patientUpdated = true;
            }
        }
        if (!patient.idLocalInMPI && patientUpdated) {
            await Patient.updateOne({ _id: patient._id }, { idLocalInMPI: true });
        }
        return patientUpdated;
    } catch (e) {
        return false;
    }
};

Patient.schema.method('findOrCreate', async (patientParam: IPatient, ambito?: string): Promise<IPatient> => {
    try {
        // Validar que el DNI no sea undefined
        if (!patientParam.dni) {
            throw new Error('DNI es requerido');
        }

        // Buscar paciente en base de datos local
        let patient: IPatient | null = await Patient.findOne({
            dni: patientParam.dni,
            sex: patientParam.sex
        });

        const sexo = patientParam.sex.toLowerCase();

        // Si existe localmente, verificar si tiene idMPI y fechaNac
        if (patient) {
            // Si le faltan datos, buscar en MPI para completarlos
            if (!patient.idMPI) {
                const mpiPatientsForUpdate = await searchPatientInAndesMPI(patientParam.dni, sexo);

                if (mpiPatientsForUpdate.length > 0) {
                    // Actualizar paciente local con datos de MPI
                    patient = await updateLocalPatientWithMPIData(patient, mpiPatientsForUpdate);
                } else if (ambito === 'publico') {
                    // Si no existe en MPI y es ámbito público, crear en Andes y actualizar local
                    const newAndesPatient = await createPatientInAndesMPI(patientParam);
                    const updatedData = mapAndesPatientToLocal(newAndesPatient);
                    await Patient.updateOne({ _id: patient._id }, updatedData);
                    patient = await Patient.findById(patient._id) as IPatient;
                }
            }
            if (ambito === 'publico' && !patient.idLocalInMPI) {
                // Asegurarse de que el paciente tenga el ID de Recetar en Andes
                await updateAndes(patient);
            }
            return patient;
        }

        // Si no existe localmente, buscar en MPI de Andes
        const mpiPatients = await searchPatientInAndesMPI(patientParam.dni, sexo);

        if (mpiPatients.length > 0) {
            // Si existe en MPI, crear paciente local con esos datos
            const matchingMPIPatient = mpiPatients.find((item: any) =>
                item.sexo === patientParam.sex.toLowerCase()
            );

            if (matchingMPIPatient) {
                const localPatientData = mapAndesPatientToLocal(matchingMPIPatient);
                patient = new Patient(localPatientData);
                await patient.save();
                return patient;
            }
        }

        // Si no existe en MPI y el ámbito es 'publico', crear en Andes primero
        if (ambito === 'publico') {
            patient = await createPatientForPublicScope(patientParam);
            return patient;
        }

        // Si no es ámbito público, crear solo localmente
        patient = new Patient(patientParam);
        await patient.save();
        return patient;

    } catch (err) {
        throw new Error(`Error en findOrCreate: ${err}`);
    }
});

export default Patient;
