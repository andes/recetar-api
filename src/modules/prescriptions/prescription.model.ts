import mongoose from 'mongoose';
import { IPrescription } from './prescription.types';

const supplySubSchema = new mongoose.Schema({
    name: { type: String },
    activePrinciple: { type: String },
    pharmaceutical_form: { type: String },
    power: { type: String },
    unity: { type: String },
    firstPresentation: { type: String },
    secondPresentation: { type: String },
    snomedConcept: {
        conceptId: String,
        term: String,
        fsn: String,
        semanticTag: String,
    },
    code: {
        source: { type: String, enum: ['SIFAHO', 'SNOMED'] },
        value: String,
    },
    type: { type: String, enum: ['device', 'nutrition', 'magistral'] },
    requiresSpecification: { type: Boolean },
    specification: { type: String },
}, { _id: false });

const supplyEntrySubSchema = new mongoose.Schema({
    _id: false,
    supply: { type: supplySubSchema },
    quantity: Number,
    quantityPresentation: Number,
    diagnostic: String,
    indication: String,
    duplicate: Boolean,
    triplicate: Boolean,
    triplicateData: {
        serie: String,
        numero: Number,
    },
});

const prescriptionSchema = new mongoose.Schema({
    prescriptionId: { type: String, unique: true, sparse: true },
    patient: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        dni: { type: String, required: true },
        sex: { type: String, required: true },
        obraSocial: {
            nombre: String,
            numeroAfiliado: String,
        },
        fechaNac: Date,
        idMPI: String,
    },
    professional: {
        userId: String,
        businessName: { type: String, required: true },
        cuil: String,
        enrollment: String,
        profesionGrado: [{
            profesion: String,
            codigoProfesion: String,
            numeroMatricula: String,
        }],
    },
    dispensedBy: {
        userId: String,
        businessName: String,
        cuil: String,
    },
    dispensedAt: Date,
    supplies: [supplyEntrySubSchema],
    status: {
        type: String,
        enum: ['Pendiente', 'Dispensada', 'Vencida'],
        default: 'Pendiente',
    },
    date: { type: Date, default: Date.now, required: true },
    ambito: { type: String, enum: ['publico', 'privado'], default: 'privado' },
    trimestral: Boolean,
    organizacion: {
        _id: String,
        nombre: String,
        direccion: String,
    },
}, { timestamps: true });

prescriptionSchema.index({ 'professional.userId': 1 });
prescriptionSchema.index({ 'supplies.supply.type': 1 });
prescriptionSchema.index({ status: 1, date: 1 });

const Prescription = mongoose.models.Prescription
    || mongoose.model<IPrescription>('Prescription', prescriptionSchema);

export default Prescription;
