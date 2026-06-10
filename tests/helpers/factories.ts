import Role from '../../src/models/role.model';
import User, { IUser } from '../../src/models/user.model';

export async function createRole(roleName: string) {
    return Role.create({ role: roleName });
}

export async function createUser(overrides: Record<string, unknown> = {}): Promise<IUser> {
    const role = await createRole((overrides.roleType as string) || 'professional');
    const userData: Record<string, unknown> = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        businessName: 'Test User',
        isActive: true,
        roles: [role._id],
        passwordCreatedAt: new Date(),
        ...overrides,
    };
    delete userData.roleType;
    return User.create(userData);
}
