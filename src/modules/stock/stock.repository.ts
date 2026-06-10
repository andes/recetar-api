import mongoose from 'mongoose';

const PrescriptionSchema = new mongoose.Schema({
    supplies: [{
        _id: false,
        supply: {
            name: { type: String },
            type: { type: String, enum: ['device', 'nutrition', 'magistral'] },
        },
        quantity: Number,
    }],
    date: { type: Date, default: Date.now },
}, { strict: false, timestamps: true });

const Prescription = mongoose.models.Prescription
    || mongoose.model('Prescription', PrescriptionSchema);

export class StockRepository {
    async findAllWithSupplies(skip = 0, limit = 100): Promise<{ stock: unknown[]; total: number }> {
        const filter = { 'supplies.supply.type': { $exists: true } };
        const [stock, total] = await Promise.all([
            Prescription.find(filter).sort({ date: -1 }).skip(skip).limit(limit).exec(),
            Prescription.countDocuments(filter).exec(),
        ]);
        return { stock, total };
    }
}
