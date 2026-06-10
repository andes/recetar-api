import { Schema, Model, model, Document, Types } from 'mongoose';

export interface IRole extends Document {
    role: string;
    users: Types.ObjectId[];
    permissions: Types.ObjectId[];
    createdAt?: Date;
    updatedAt?: Date;
}

const roleSchema = new Schema({
    role: {
        type: String,
        required: '{PATH} is required'
    },
    users: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    permissions: [{
        type: Schema.Types.ObjectId,
        ref: 'Permission'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date,
});

const Role: Model<IRole> = model<IRole>('Role', roleSchema);

export default Role;
