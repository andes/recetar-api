import { Schema, model, Document } from 'mongoose';

export interface ISecurityToken extends Document {
    token: string;
    userId: Schema.Types.ObjectId;
    createdAt: Date;
    expiresAt: Date;
    used: boolean;
}

export const securityTokenSchema = new Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    },
    used: {
        type: Boolean,
        default: false,
        required: true
    }
});

securityTokenSchema.index({ token: 1, userId: 1 });

const SecurityToken = model<ISecurityToken>('SecurityToken', securityTokenSchema);

export default SecurityToken;
