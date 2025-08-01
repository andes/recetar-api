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
    endDate: { type: Date, required: true },
    createdAt: {
        type: Date,
        default: Date.now
    },
    status: { type: String },
    anulateReason: { type: String },
    anulateDate: {
        type: Date,
        default: Date.now
    }
});

const Certificate: Model<ICertificate> = model<ICertificate>('Certificate', certificateSchema);

export default Certificate;