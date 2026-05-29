import { Schema, Model, model, Document, Types } from 'mongoose';

export interface IPermission extends Document {
    resource: string;
    action: string;
    attributes: string[];
    roles: Types.ObjectId[];
    createdAt?: Date;
    updatedAt?: Date;
}

const permissionSchema = new Schema({
    resource: {
        type: String,
        required: '{PATH} is required'
    },
    action: {
        type: String,
        required: '{PATH} is required'
    },
    attributes: [{
        type: String,
        required: '{PATH} is required'
    }],
    roles: [{
        type: Schema.Types.ObjectId,
        ref: 'Role'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date,
});

const Permission: Model<IPermission> = model<IPermission>('Permission', permissionSchema);

export default Permission;
