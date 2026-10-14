import Role from '../../models/role.model';

export const ROLE_NAMES = [
    'owner',
    'admin',
    'auditor',
    'professional',
    'professional-public',
    'pharmacist',
    'pharmacist-public',
] as const;

export type RoleName = typeof ROLE_NAMES[number];

export async function seedRoles(): Promise<void> {
    for (const role of ROLE_NAMES) {
        await Role.updateOne({ role }, { $setOnInsert: { role } }, { upsert: true }).exec();
    }
}
