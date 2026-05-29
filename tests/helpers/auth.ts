import jwt from 'jsonwebtoken';
import { createUser } from './factories';
import { IUser } from '../../src/models/user.model';

export async function createAuthenticatedUser(overrides: Record<string, unknown> = {}): Promise<{ user: IUser; token: string }> {
    const user = await createUser(overrides);
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
        {
            iss: 'recetar.andes',
            sub: user._id.toString(),
            usrn: user.username,
            bsname: user.businessName,
            rl: ['professional'],
            iat: now,
            exp: now + 3600,
        },
        process.env.JWT_SECRET || 'test-jwt-secret',
        { algorithm: 'HS256' },
    );
    return { user, token };
}
