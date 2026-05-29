import User, { IUser } from '../../models/user.model';
import Role from '../../models/role.model';
import { Types } from 'mongoose';

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    offset: number;
    limit: number;
}

export class UsersRepository {
    async findById(id: string): Promise<IUser | null> {
        return User.findById(id)
            .select('-password -refreshToken -authenticationToken')
            .populate('roles', 'role description')
            .exec();
    }

    async findByIdWithPassword(id: string): Promise<IUser | null> {
        return User.findById(id)
            .populate('roles', 'role')
            .exec();
    }

    async list(
        query: Record<string, unknown>,
        offset: number,
        limit: number,
    ): Promise<PaginatedResult<IUser>> {
        const items = await User.find(query, { password: 0, refreshToken: 0, authenticationToken: 0 })
            .populate('roles', 'role')
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .exec();
        const total = await User.countDocuments(query);
        return { items, total, offset, limit };
    }

    async findByEmail(email: string): Promise<IUser | null> {
        return User.findOne({ email }).exec();
    }

    async findByEmailExcludingId(email: string, excludeId: string): Promise<IUser | null> {
        return User.findOne({ email, _id: { $ne: excludeId } }).exec();
    }

    async findByUsername(username: string): Promise<IUser | null> {
        return User.findOne({ username }).exec();
    }

    async findByUsernameExcludingId(username: string, excludeId: string): Promise<IUser | null> {
        return User.findOne({ username, _id: { $ne: excludeId } }).exec();
    }

    async findOneByEmailConfirmationToken(token: string): Promise<IUser | null> {
        return User.findOne({
            emailConfirmationToken: token,
            emailConfirmationExpires: { $gt: new Date() },
        }).populate('roles').exec();
    }

    async create(data: Partial<IUser>): Promise<IUser> {
        const user = new User(data);
        return user.save();
    }

    async updateById(id: string, data: Record<string, unknown>): Promise<IUser | null> {
        return User.findByIdAndUpdate(id, data, {
            new: true,
            projection: { password: 0, refreshToken: 0, authenticationToken: 0 },
            runValidators: false,
        }).populate('roles', 'role').exec();
    }

    async findRolesByIds(ids: string[]): Promise<any[]> {
        return Role.find({ _id: { $in: ids } }).exec();
    }

    async pushUserToRoles(roleIds: Types.ObjectId[], userId: Types.ObjectId): Promise<void> {
        await Role.updateMany(
            { _id: { $in: roleIds } },
            { $push: { users: userId } },
        ).exec();
    }

    async findRoleByType(roleType: string): Promise<any> {
        return Role.findOne({ role: roleType }).exec();
    }

    async saveUser(user: IUser): Promise<IUser> {
        return user.save();
    }
}
