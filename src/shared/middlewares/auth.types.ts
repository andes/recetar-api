import { IUser } from '../../models/user.model';

export interface PrincipalUser extends IUser {
    roleNames: string[];
}

export const extractRoleNames = (roles: Array<{ role?: string }> = []): string[] =>
    roles
        .map(role => role?.role)
        .filter((role): role is string => !!role);
