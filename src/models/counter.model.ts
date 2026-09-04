import mongoose, { Schema, model, Model, Document } from 'mongoose';

export interface ICounter extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    seq: number;
}

interface ICounterModel extends Model<ICounter> {
    getNextSeq(name: string): Promise<number>;
}

const counterSchema = new Schema({
    name: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

counterSchema.index({ name: 1 }, { unique: true });

counterSchema.statics.getNextSeq = async function(name: string): Promise<number> {
    const counter = await this.findOneAndUpdate(
        { name },
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
    );
    return counter.seq;
};

const Counter = model<ICounter, ICounterModel>('Counter', counterSchema);

export default Counter;
