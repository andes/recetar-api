import { Schema, model, Model } from 'mongoose';

// Schema para contadores secuenciales
// Documento: { _id: 'prescription_26_09', seq: 42 }
export const counterSchema = new Schema({
    _id: {
        type: String,
        required: true
    },
    seq: {
        type: Number,
        default: 0
    }
});

// Model
const Counter: Model<any> = model<any>('Counter', counterSchema);

export default Counter;
