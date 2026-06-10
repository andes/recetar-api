import mongoose, { Schema, Model } from 'mongoose';
import { ICertificate } from './certificates.types';
import { patientSubSchema } from '../patients/patients.model';

const professionalCertSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true },
    businessName: { type: String, required: true },
    cuil: { type: String },
    enrollment: { type: String },
    profesionGrado: [{
        profesion: { type: String, required: true },
        codigoProfesion: { type: String, required: true },
        numeroMatricula: { type: String, required: true },
    }],
}, { _id: false });

const certificateSchema = new Schema({
    patient: { type: patientSubSchema, required: true },
    professional: { type: professionalCertSchema, required: true },
    certificate: { type: String },
    startDate: { type: Date, required: true },
    cantDias: { type: Number, required: true },
    status: { type: String },
    anulateReason: { type: String },
    anulateDate: { type: Date },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

certificateSchema.virtual('endDate').get(function (this: { startDate?: Date; cantDias?: number }) {
    if (!this.startDate || !this.cantDias) {
        return null;
    }
    const endDate = new Date(this.startDate);
    endDate.setDate(endDate.getDate() + this.cantDias - 1);
    endDate.setHours(23, 59, 59, 999);
    return endDate;
});

const Certificate: Model<ICertificate> = mongoose.model<ICertificate>('Certificate', certificateSchema);

export default Certificate;
