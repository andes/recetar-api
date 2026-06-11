import bcrypt from 'bcryptjs';

export class SecurityPinUtils {
    static async hashPin(pin: string): Promise<string> {
        const salt = bcrypt.genSaltSync(10);
        return bcrypt.hash(pin, salt);
    }

    static async verifyPin(pin: string, hash: string): Promise<boolean> {
        return bcrypt.compare(pin, hash);
    }
}
