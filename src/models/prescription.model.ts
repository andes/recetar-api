import { Schema, Model, model } from 'mongoose';
import IPrescription from '../interfaces/prescription.interface';
import { supplySchema } from '../models/supply.model';
import { patientSubSchema } from '../models/patient.model';
import Counter from '../models/counter.model';

// Schema
const prescriptionSchema = new Schema({
    prescriptionId: {
        type: String,
        unique: true,
        sparse: true
    },
    patient: patientSubSchema,
    professional: {
        userId: Schema.Types.ObjectId,
        businessName: { type: String, required: true },
        cuil: { type: String },
        enrollment: { type: String },
        profesionGrado: [{
            profesion: { type: String },
            codigoProfesion: { type: String },
            numeroMatricula: { type: String }
        }]
    },
    dispensedBy: {
        userId: Schema.Types.ObjectId,
        businessName: { type: String },
        cuil: { type: String },
    },
    dispensedAt: { type: Date },
    supplies: [{
        _id: false,
        supply: {
            ...supplySchema.obj,
            type: {
                type: String,
                enum: ['device', 'nutrition', 'magistral']
            },
            requiresSpecification: {
                type: Boolean
            },
            specification: {
                type: String
            }
        },
        quantity: Number,
        quantityPresentation: Number,
        unidadMedida: { type: String },
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
        },
        triplicateData: {
            serie: { type: String },
            numero: { type: Number },
        },
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
    },
    organizacion: {
        _id: { type: Schema.Types.ObjectId },
        nombre: { type: String },
        direccion: { type: String }
    }
});


prescriptionSchema.post('save', async (prescription: IPrescription) => {
    // genera id unico si no tiene
    if (!prescription.prescriptionId) {
        const id = await generarIdSecuencial(prescription.createdAt, 1);
        await Prescription.updateOne({ _id: prescription._id }, { $set: { prescriptionId: id } });
    }

});

export async function generarIdSecuencial(fecha: Date = new Date(), plataforma: number): Promise<string> {
    // genera id unico secuencial por mes: YY MM NNNNNNNN P
    const pad = (num: number, size: number) => num.toString().padStart(size, '0');
    const yy = fecha.getFullYear().toString().slice(-2);
    const mm = pad(fecha.getMonth() + 1, 2);
    const name = `prescription_${yy}_${mm}`;
    const seq = await Counter.getNextSeq(name);
    return `${yy}${mm}${pad(seq, 8)}${plataforma}`;
}
// Model
const Prescription: Model<IPrescription> = model<IPrescription>('Prescription', prescriptionSchema);

export default Prescription;
