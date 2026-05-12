import { Schema, Model, model } from 'mongoose';
import ISupply from '../interfaces/supply.interface';

// Schema
export const supplySchema = new Schema({

  name: {
    type: String,
    required: '{PATH} is required'
  },
  activePrinciple: {
    type: String
  },
  pharmaceutical_form: {
    type: String
  },
  power: {
    type: String
  },
  unity: {
    type: String
  },
  firstPresentation: {
    type: String
  },
  secondPresentation: {
    type: String
  },
  code: {
    source: { type: String, enum: ['SIFAHO', 'SNOMED'] },
    value: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Model
const Supply: Model<ISupply> = model<ISupply>('Supply', supplySchema);


export default Supply;
