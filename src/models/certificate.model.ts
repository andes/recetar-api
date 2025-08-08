import { Schema, Model, model } from "mongoose";
import { patientSchema } from "./patient.model";
import ICertificate from "../interfaces/certificate.interface";


const certificateSchema = new Schema({
    patient: patientSchema,
    professional: {
        userId: Schema.Types.ObjectId,
        businessName: { type: String, required: true },
        cuil: { type: String },
        enrollment: { type: String },
    },
    certificate: { type: String },
    startDate: { type: Date, required: true },
    cantDias: { type: Number, required: true },
    createdAt: {
        type: Date,
        default: Date.now
    },
    status: { type: String },
    anulateReason: { type: String },
    anulateDate: {
        type: Date
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

certificateSchema.virtual('endDate').get(function () {
    if (!this.startDate || !this.cantDias) {
        return null;
    }
    const endDate = new Date(this.startDate);
    endDate.setDate(endDate.getDate() + this.cantDias - 1);
    endDate.setHours(23, 59, 59, 999); 
    return endDate;
});

const Certificate: Model<ICertificate> = model<ICertificate>('Certificate', certificateSchema);

export default Certificate;