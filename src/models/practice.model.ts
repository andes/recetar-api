import { Schema, Model, model } from 'mongoose';
import IPractice from '../interfaces/practice.interface';
import { patientSchema } from './patient.model';

const practiceSchema: Schema = new Schema({
  date: {
    type: Date,
    required: true
  },
  patient: patientSchema,
  professional: {
    userId: {
      type: String,
      required: true
    },
    enrollment: {
      type: String,
      required: true
    },
    cuil: {
      type: String,
      required: true
    },
    businessName: {
      type: String,
      required: true
    }
  },
  practice: {
    type: String,
    required: false
  },
  diagnostic: {
    type: String,
    required: false
  },
  indications: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  }
}, {
  timestamps: true
});

const Practice: Model<IPractice> = model<IPractice>('Practice', practiceSchema);

export default Practice;