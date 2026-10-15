import Role from '../../src/models/role.model';
import User, { IUser } from '../../src/models/user.model';
import mongoose from 'mongoose';
import Professional from '../../src/modules/professionals/professionals.model';

export async function createRole(roleName: string) {
    return Role.create({ role: roleName });
}

export async function createProfessionalProfile(overrides: Record<string, unknown> = {}) {
    return Professional.create({
        userId: new mongoose.Types.ObjectId('000000000000000000000001'),
        tipoDocumento: 'DNI',
        documento: '30123456',
        nombre: 'Ana',
        apellido: 'Pérez',
        sexo: 'Femenino',
        cuit: '27-30123456-8',
        profesionGrado: [{
            profesion: 'Médico',
            codigoProfesion: '1',
            numeroMatricula: '12345',
            estado: 'vigente',
        }],
        ...overrides,
    });
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
