import { Schema, Model, model } from 'mongoose';
import IPrescription from '../interfaces/prescription.interface';
import { supplySchema } from '../models/supply.model';
import { patientSchema } from '../models/patient.model';
import ObraSocial from './obraSocial.model';

// Schema
const prescriptionSchema = new Schema({
  patient: patientSchema,
  professional: {
    userId: Schema.Types.ObjectId,
    businessName: { type: String, required: true },
    cuil: { type: String },
    enrollment: { type: String },
  },
  dispensedBy: {
    userId: Schema.Types.ObjectId,
    businessName: { type: String },
    cuil: { type: String },
  },
  dispensedAt: { type: Date },
  supplies: [{
    _id: false,
    supply: supplySchema,
    quantity: Number,
    diagnostic: {
      type: String,
    },
    indication: {
      type: String,
    },
    duplicate: {
      type: Boolean,
    },
    triplicate: {
      type: Boolean,
    }
  }],
  status: {
    type: String,
    enum: ['Pendiente', 'Dispensada', 'Vencida'],
    default: 'Pendiente'
  },
  date: {
    type: Date,
    default: Date.now,
    required: '{PATH} is required'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date,
  triple: {
    type: Boolean,
  },
  obraSocial: {
    type: Schema.Types.ObjectId,
    ref: 'ObraSocial'
  }
});

// Model
const Prescription: Model<IPrescription> = model<IPrescription>('Prescription', prescriptionSchema);

export default Prescription;
