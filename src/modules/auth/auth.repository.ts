import User, { IUser } from '../../models/user.model';
import Role from '../../models/role.model';

export class AuthRepository {
    async findByEmailOrUsername(identifier: string): Promise<IUser | null> {
        return User.findOne({ $or: [{ email: identifier }, { username: identifier }] })
            .populate({ path: 'roles', select: 'role' })
            .exec();
    }

    async findById(id: string): Promise<IUser | null> {
        return User.findById(id).populate({ path: 'roles', select: 'role' }).exec();
    }

    async findOneByRefreshToken(refreshToken: string): Promise<IUser | null> {
        return User.findOne({ refreshToken }).populate({ path: 'roles', select: 'role' }).exec();
    }

    async findOneByAuthenticationToken(token: string): Promise<IUser | null> {
        return User.findOne({ authenticationToken: token }).exec();
    }

    async findOneByUsername(username: string): Promise<IUser | null> {
        return User.findOne({ username }).populate({ path: 'roles', select: 'role' }).exec();
    }

    async findByEmail(email: string): Promise<IUser | null> {
        return User.findOne({ email }).exec();
    }

    async updateRefreshToken(id: string, refreshToken: string): Promise<void> {
        await User.updateOne({ _id: id }, { refreshToken }).exec();
    }

    async clearRefreshToken(refreshToken: string): Promise<void> {
        await User.findOneAndUpdate({ refreshToken }, { refreshToken: '' }).exec();
    }

    async updateLastLogin(id: string): Promise<void> {
        await User.updateOne({ _id: id }, { lastLogin: new Date() }).exec();
    }

    async findRoleByType(roleType: string): Promise<any> {
        return Role.findOne({ role: roleType }).exec();
    }

    async createUser(data: Partial<IUser>): Promise<IUser> {
        const user = new User(data);
        return user.save();
    }

    async saveRole(role: any): Promise<void> {
        await role.save();
    }

    async findAllRoles(): Promise<any[]> {
        return Role.find({}).select('role').exec();
    }

    async saveUser(user: IUser): Promise<IUser> {
        return user.save();
    }
}
