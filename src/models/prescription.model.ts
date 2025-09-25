import { Schema, Model, model } from 'mongoose';
import IPrescription from '../interfaces/prescription.interface';
import { supplySchema } from '../models/supply.model';
import { patientSchema } from '../models/patient.model';

// Schema
const prescriptionSchema = new Schema({
    prescriptionId: {
        type: String,
        unique: true,
        sparse: true
    },
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
        quantityPresentation: Number,
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
    triplicate: {
        type: Boolean,
    },
    triplicateData: {
        serie: { type: String },
        numero: { type: Number },
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
    trimestral: {
        type: Boolean,
    },
    obraSocial: {
        type: Schema.Types.ObjectId,
        ref: 'ObraSocial'
    },
    ambito: {
        type: String,
        enum: ['publico', 'privado'],
        default: 'privado'
    }
});


prescriptionSchema.post('save', async (prescription: IPrescription) => {
    // genera id unico si no tiene
    if (!prescription.prescriptionId) {
        const id = generarIdDesdeFecha(prescription.createdAt);
        await Prescription.updateOne({ _id: prescription._id }, { $set: { prescriptionId: id } });
    }

});

export function generarIdDesdeFecha(fecha = new Date()) {
    // genera id unico de acuerdo a una fecha
    const pad = (num: number, size: number) => num.toString().padStart(size, '0');
    return String(
        fecha.getFullYear().toString() +
        pad(fecha.getMonth() + 1, 2) +
        pad(fecha.getDate(), 2) +
        pad(fecha.getHours(), 2) +
        pad(fecha.getMinutes(), 2) +
        pad(fecha.getSeconds(), 2) +
        pad(fecha.getMilliseconds(), 3) +
        pad(Math.floor(Math.random() * 999), 3)
    );
}
// Model
const Prescription: Model<IPrescription> = model<IPrescription>('Prescription', prescriptionSchema);

export default Prescription;
