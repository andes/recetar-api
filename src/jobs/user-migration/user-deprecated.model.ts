import { Schema, Model, model } from 'mongoose';
import IUserOld from './user-deprecated.interface';
import passport from 'passport';
import bcrypt from 'bcryptjs';

const uniqueEmail = async (email: string): Promise<boolean> => {
  const user = await UserDeprecated.findOne({ email });
  return !user;
};

const validEmail = (email: string): boolean => {
  var emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailRegex.test(email);
};

const uniqueUsername = async function(username: string): Promise<boolean> {
  const _id = typeof(this._id) !== 'undefined' ? this._id : this.getFilter()._id;
  const user = await UserDeprecated.findOne({ username, _id: { $nin: [_id] } });
  return !user;
};

const encryptPassword = (password: string) => {
  const salt = bcrypt.genSaltSync(10);
  const passwordDigest = bcrypt.hashSync(password, salt);
  return passwordDigest;
}

const userSchema = new Schema({
  username: {
    type: String,
    required: '{PATH} is required',
    unique: true
  },
  email: {
    type: String
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
  }
})

const UserDeprecated: Model<IUserOld> = model<IUserOld>('Deprecated-user', userSchema);

UserDeprecated.schema.method('isValidPassword', async function(thisUser: IUserOld, password: string): Promise<boolean>{
  try{
    return await bcrypt.compare(password, thisUser.password);
  }catch(err){
    throw err;
  }
});

UserDeprecated.schema.path('username').validate(uniqueUsername, 'This {PATH} is already registered');

export default UserDeprecated;