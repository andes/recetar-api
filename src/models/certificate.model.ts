import { Schema, Model, model } from "mongoose";
import { supplySchema } from '../models/supply.model';
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
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date
});

const Certificate: Model<ICertificate> = model<ICertificate>('Certificate', certificateSchema);

export default Certificate;