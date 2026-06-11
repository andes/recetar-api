import { Schema, Model, model, Document, Types } from 'mongoose';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    username: string;
    email: string;
    pendingEmail?: string;
    emailConfirmationToken?: string;
    emailConfirmationExpires?: Date;
    businessName: string;
    enrollment?: string;
    cuil?: string;
    password: string;
    roles: Array<{ _id: Types.ObjectId; role?: string }>;
    refreshToken?: string;
    authenticationToken?: string;
    passwordChangeTokenExpiry?: Date;
    passwordCreatedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    isActive: Boolean;
    activation?: {
        updatedAt: Date;
        updatedBy: Types.ObjectId;
        userId: Types.ObjectId;
        userName: string;
    };
    lastLogin?: Date;
    idAndes?: string;
    profesionGrado?: Array<{
        profesion: string;
        codigoProfesion: string;
        numeroMatricula: string;
        vencimiento?: Date;
    }>;
    organizaciones: Array<{
        _id: string;
        nombre: string;
        direccion: string;
    }>;
    authorizationExpiration?: Date;
    authorizationDisposition?: string;
    responsibleDTEnrollment?: string;
    securityPin?: {
        hash: string;
        isActive: boolean;
    };
    webauthnCredentials?: Array<{
        credentialId: string;
        publicKey: string;
        counter: number;
        deviceType: string;
        backedUp: boolean;
        transport: string[];
        createdAt: Date;
        lastUsedAt?: Date;
    }>;
    webauthnChallenge?: string;
    webauthnChallengeExpires?: Date;
    isValidPassword(password: string): Promise<boolean>;
}

const uniqueEmail = async (email: string): Promise<boolean> => {
    const user = await User.findOne({ email });
    return !user;
};

const validEmail = (email: string): boolean => {
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailRegex.test(email);
};

const uniqueUsername = async function (this: any, username: string): Promise<boolean> {
    const _id = typeof (this._id) !== 'undefined' ? this._id : this.getFilter()._id;
    const user = await User.findOne({ username, _id: { $nin: [_id] } });
    return !user;
};

const encryptPassword = (password: string) => {
    const salt = bcrypt.genSaltSync(10);
    const passwordDigest = bcrypt.hashSync(password, salt);
    return passwordDigest;
};

export const userSchema = new Schema({
    username: {
        type: String,
        required: '{PATH} is required',
        unique: true
    },
    email: {
        type: String
    },
    pendingEmail: {
        type: String
    },
    emailConfirmationToken: {
        type: String
    },
    emailConfirmationExpires: {
        type: Date
    },
    enrollment: {
        type: String
    },
    cuil: {
        type: String
    },
    businessName: {
        type: String
    },
    password: {
        type: String,
        required: '{PATH} is required is required',
        minlength: [8, '{PATH} required a minimum of 8 characters'],
        set: encryptPassword
    },
    roles: [{
        type: Schema.Types.ObjectId,
        ref: 'Role'
    }],
    refreshToken: {
        type: String,
    },
    authenticationToken: {
        type: String,
    },
    passwordChangeTokenExpiry: {
        type: Date,
    },
    passwordCreatedAt: {
        type: Date,
        default: undefined
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date,
    isActive: {
        type: Boolean,
        default: true,
        required: [true, '{PATH} is required']
    },
    activation: {
        updatedAt: {
            type: Date
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        userName: {
            type: String
        }
    },
    lastLogin: {
        type: Date,
        default: new Date('2020-04-02T00:00:00.000Z')
    },
    idAndes: {
        type: String,
        default: ''
    },
    profesionGrado: [{
        profesion: {
            type: String,
            required: '{PATH} is required'
        },
        codigoProfesion: {
            type: String,
            required: '{PATH} is required'
        },
        numeroMatricula: {
            type: String,
            required: '{PATH} is required'
        },
        vencimiento: {
            type: Date
        },
    }],
    organizaciones: [
        {
            _id: {
                type: String,
                default: () => new mongoose.Types.ObjectId().toString()
            },
            nombre: String,
            direccion: String,
            provincia: String,
        }
    ],
    authorizationExpiration: {
        type: Date
    },
    authorizationDisposition: {
        type: String
    },
    responsibleDTEnrollment: {
        type: String
    },
    securityPin: {
        hash: {
            type: String
        },
        isActive: {
            type: Boolean,
            default: false
        }
    },
    webauthnCredentials: [{
        credentialId: {
            type: String,
            required: true
        },
        publicKey: {
            type: String,
            required: true
        },
        counter: {
            type: Number,
            default: 0
        },
        deviceType: {
            type: String,
            default: 'singleDevice'
        },
        backedUp: {
            type: Boolean,
            default: false
        },
        transport: [{
            type: String
        }],
        createdAt: {
            type: Date,
            default: Date.now
        },
        lastUsedAt: {
            type: Date
        }
    }],
    webauthnChallenge: {
        type: String
    },
    webauthnChallengeExpires: {
        type: Date
    }
});

userSchema.path('username').validate(uniqueUsername, 'This {PATH} is already registered');

const User: Model<IUser> = model<IUser>('User', userSchema);

export const isValidPassword = async (thisUser: IUser, password: string): Promise<boolean> => {
    try {
        return await bcrypt.compare(password, thisUser.password);
    } catch (err) {
        throw err;
    }
};

userSchema.method('isValidPassword', isValidPassword);

export default User;
