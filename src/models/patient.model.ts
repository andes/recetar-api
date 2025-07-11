import { Schema, Model, model } from 'mongoose';
import IPatient from '../interfaces/patient.interface';
import { env } from '../config/config';
import needle from 'needle';
import { obraSocialSchema } from './obraSocial.model';

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
});

// Model
const Patient: Model<IPatient> = model<IPatient>('Patient', patientSchema);

Patient.schema.method('findOrCreate', async function (patientParam: IPatient): Promise<IPatient> {
  try {
    // Buscar paciente en db local
    let patient: IPatient | null = await Patient.findOne({ dni: patientParam.dni, sex: patientParam.sex });

    // Si no está local, buscar en MPI de Andes y guardar
    if (!patient) {
      const resp = await needle("get", `${process.env.ANDES_MPI_ENDPOINT}?search=${patientParam.dni}&activo=true`, { headers: { 'Authorization': process.env.JWT_MPI_TOKEN } })
      resp.body.forEach(async function (item: any) {
        if (item.sexo === patientParam.sex.toLocaleLowerCase()) {
          patient = <IPatient>{
            dni: item.documento,
            firstName: item.nombre,
            lastName: item.apellido,
            sex: item.sexo[0].toUpperCase() + item.sexo.substr(1).toLowerCase(),
            status: item.estado[0].toUpperCase() + item.estado.substr(1).toLowerCase(),
            genero: item.genero,
            nombreAutopercibido: item.alias,
            idMPI: item.id,
            tipoDocumentoExtranjero: item.tipoIdentificacion || '',
            nroDocumentoExtranjero: item.numeroIdentificacion || '',
            estado: item.estado
          }

          patient = new Patient(patient);
          await patient.save();
        }
      });
    }

    // Si tampoco no está local ni en MPI, crear uno nuevo
    if (!patient) {
      patient = new Patient(patientParam);
      await patient.save();
    }
    return patient;
  } catch (err) {
    throw new Error(`${err}`);
  }
});

export default Patient;
