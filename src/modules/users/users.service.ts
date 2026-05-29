import crypto from 'crypto';
import { EmailService, EmailTemplateService, MailOptions } from '../../integrations/email';
import { AndesClient } from '../../integrations/andes';
import { UsersRepository } from './users.repository';
import {
    UserNotFoundError,
    UserNotActiveError,
    EmailAlreadyTakenError,
    UsernameAlreadyTakenError,
    InvalidEmailTokenError,
    SelfUpdateForbiddenError,
    RoleNotFoundError,
} from './users.errors';
import {
    CreateUserDTO,
    UpdateUserDTO,
    ListUsersDTO,
} from './users.dto';
import { IUser } from '../../models/user.model';
import { Types } from 'mongoose';

export class UsersService {
    private readonly appDomain: string;

    constructor(
        private readonly repository: UsersRepository,
        private readonly andesClient: AndesClient,
        private readonly emailService?: EmailService,
        private readonly emailTemplateService?: EmailTemplateService,
    ) {
        this.appDomain = process.env.APP_DOMAIN || 'https://recetar.andes.gob.ar';
    }

    async index(dto: ListUsersDTO) {
        const searchTerm = dto.searchTerm;
        const offset = dto.offset || 0;
        const limit = dto.limit || 10;

        let query: Record<string, unknown> = {};
        if (searchTerm) {
            query = {
                $or: [
                    { email: { $regex: searchTerm, $options: 'i' } },
                    { username: { $regex: searchTerm, $options: 'i' } },
                    { businessName: { $regex: searchTerm, $options: 'i' } },
                    { firstName: { $regex: searchTerm, $options: 'i' } },
                    { lastName: { $regex: searchTerm, $options: 'i' } },
                ],
            };
        }

        return this.repository.list(query, offset, limit);
    }

    async getById(id: string) {
        const user = await this.repository.findById(id);
        if (!user) {
            throw new UserNotFoundError();
        }
        if (!user.isActive) {
            throw new UserNotActiveError();
        }
        return {
            id: user._id,
            username: user.username,
            email: user.email,
            businessName: user.businessName,
            enrollment: user.enrollment,
            cuil: user.cuil,
            roles: user.roles,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastLogin: user.lastLogin,
            isActive: user.isActive,
            organizaciones: user.organizaciones,
        };
    }

    async create(dto: CreateUserDTO, creator: IUser) {
        const finalUsername = dto.username;

        if (dto.roles && dto.roles.length === 1) {
            const roleObj = await this.repository.findRoleByType('auditor');
            if (roleObj && dto.roles[0] === roleObj._id.toString()) {
                if (!dto.username) {
                    throw new Error('El nombre de usuario es requerido para crear un usuario auditor');
                }
            }
        }

        if (dto.email) {
            const existingEmail = await this.repository.findByEmail(dto.email);
            if (existingEmail) {
                throw new EmailAlreadyTakenError();
            }
        }

        if (finalUsername) {
            const existingUsername = await this.repository.findByUsername(finalUsername);
            if (existingUsername) {
                throw new UsernameAlreadyTakenError();
            }
        }

        const roleIds = dto.roles.map(r => new Types.ObjectId(r));
        const validRoles = await this.repository.findRolesByIds(roleIds.map(r => r.toString()));
        if (validRoles.length !== dto.roles.length) {
            throw new RoleNotFoundError();
        }

        const userData: Record<string, unknown> = {};
        if (dto.email) { userData.email = dto.email; }
        if (finalUsername) { userData.username = finalUsername; }
        if (dto.businessName) { userData.businessName = dto.businessName; }
        if (dto.enrollment) { userData.enrollment = dto.enrollment; }
        if (dto.cuil) { userData.cuil = dto.cuil; }
        if (dto.password) { userData.password = dto.password; }
        if (dto.roles) { userData.roles = roleIds; }
        if (dto.idAndes !== undefined) { userData.idAndes = dto.idAndes; }
        if (dto.profesionGrado && dto.profesionGrado.length > 0) { userData.profesionGrado = dto.profesionGrado; }
        if (dto.authorizationExpiration) { userData.authorizationExpiration = new Date(dto.authorizationExpiration); }
        if (dto.authorizationDisposition) { userData.authorizationDisposition = dto.authorizationDisposition; }
        if (dto.responsibleDTEnrollment) { userData.responsibleDTEnrollment = dto.responsibleDTEnrollment; }

        userData.isActive = true;
        userData.createdAt = new Date();

        const newUser = await this.repository.create(userData);

        if (roleIds.length > 0) {
            await this.repository.pushUserToRoles(roleIds, newUser._id);
        }

        return this.repository.findById(newUser._id.toString());
    }

    async update(id: string, dto: UpdateUserDTO, updater: IUser) {
        const currentUser = await this.repository.findByIdWithPassword(id);
        if (!currentUser) {
            throw new UserNotFoundError();
        }

        const updateData: Record<string, unknown> = {};

        if (typeof dto.isActive !== 'undefined' && dto.isActive !== currentUser.isActive) {
            updateData.isActive = dto.isActive;
            updateData.activation = {
                updatedAt: new Date(),
                updatedBy: updater._id,
                userId: currentUser._id,
                userName: currentUser.username,
            };
        }

        let emailChanged = false;
        const oldEmail = currentUser.email;

        if (dto.email && dto.email !== currentUser.email) {
            if (dto.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) {
                throw new Error('Formato de email inválido');
            }
            const existingEmail = await this.repository.findByEmailExcludingId(dto.email, id);
            if (existingEmail) {
                throw new EmailAlreadyTakenError();
            }
            updateData.email = dto.email;

            const isPharmacist = currentUser.roles.some((r: any) => r.role === 'pharmacist');
            if (isPharmacist) {
                const existingUsername = await this.repository.findByUsernameExcludingId(dto.email, id);
                if (existingUsername) {
                    throw new UsernameAlreadyTakenError();
                }
                updateData.username = dto.email;
            }
            emailChanged = true;
        }

        if (dto.roles && Array.isArray(dto.roles)) {
            const roleIds = dto.roles.map(r => new Types.ObjectId(r));
            const validRoles = await this.repository.findRolesByIds(roleIds.map(r => r.toString()));
            if (validRoles.length !== dto.roles.length) {
                throw new RoleNotFoundError();
            }
            updateData.roles = roleIds;
        }

        if (!updateData.username && dto.username && dto.username !== currentUser.username) {
            const existingUsername = await this.repository.findByUsernameExcludingId(dto.username, id);
            if (existingUsername) {
                throw new UsernameAlreadyTakenError();
            }
            updateData.username = dto.username;
        }

        if (dto.businessName) {
            updateData.businessName = dto.businessName;
        }
        if (dto.enrollment) { updateData.enrollment = dto.enrollment; }
        if (dto.cuil) { updateData.cuil = dto.cuil; }
        if (dto.idAndes !== undefined) { updateData.idAndes = dto.idAndes; }
        if (dto.profesionGrado && dto.profesionGrado.length > 0) { updateData.profesionGrado = dto.profesionGrado; }
        if (dto.authorizationExpiration) { updateData.authorizationExpiration = new Date(dto.authorizationExpiration); }
        if (dto.authorizationDisposition) { updateData.authorizationDisposition = dto.authorizationDisposition; }
        if (dto.responsibleDTEnrollment) { updateData.responsibleDTEnrollment = dto.responsibleDTEnrollment; }

        updateData.updatedAt = new Date();

        const result = await this.repository.updateById(id, updateData);

        if (emailChanged && result && oldEmail) {
            this.sendEmailChangeNotification(result, oldEmail, dto.email!).catch(() => {});
        }

        return result;
    }

    async updateOwnOrganizaciones(userId: string, organizaciones: Array<{ nombre: string; direccion?: string }>) {
        const user = await this.repository.findByIdWithPassword(userId);
        if (!user) {
            throw new UserNotFoundError();
        }

        const result = await this.repository.updateById(userId, {
            organizaciones,
            updatedAt: new Date(),
        });

        if (!result) {
            throw new UserNotFoundError();
        }
        return result;
    }

    async requestEmailUpdate(userId: string, newEmail: string) {
        const user = await this.repository.findByIdWithPassword(userId);
        if (!user) {
            throw new UserNotFoundError();
        }

        const existingEmail = await this.repository.findByEmailExcludingId(newEmail, userId);
        if (existingEmail) {
            throw new EmailAlreadyTakenError();
        }

        const token = crypto.randomBytes(20).toString('hex');
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        user.pendingEmail = newEmail;
        user.emailConfirmationToken = token;
        user.emailConfirmationExpires = expires;
        await this.repository.saveUser(user);

        await this.sendEmailUpdateConfirmation(user, newEmail, token);

        return { message: 'Se ha enviado un correo de confirmación a la nueva dirección.' };
    }

    async confirmEmailUpdate(token: string) {
        const user = await this.repository.findOneByEmailConfirmationToken(token);
        if (!user) {
            throw new InvalidEmailTokenError();
        }

        user.email = user.pendingEmail!;

        const isPharmacist = user.roles.some((role: any) => role.role === 'pharmacist');
        if (isPharmacist) {
            user.username = user.pendingEmail!;
        }

        user.pendingEmail = undefined;
        user.emailConfirmationToken = undefined;
        user.emailConfirmationExpires = undefined;

        await this.repository.saveUser(user);

        return { message: 'Email actualizado correctamente' };
    }

    async organizacionesAndes(nombre: string) {
        return this.andesClient.searchOrganizations(nombre);
    }

    private async sendEmailUpdateConfirmation(user: IUser, newEmail: string, token: string) {
        if (!this.emailService || !this.emailTemplateService) { return; }

        const extras = {
            titulo: 'Confirmar cambio de email',
            usuario: user,
            url: `${this.appDomain}/auth/confirm-update/${token}`,
        };

        const html = await this.emailTemplateService.render('emails/update-email.html', extras);
        const mailOptions: MailOptions = {
            from: process.env.EMAIL_USERNAME || '',
            to: newEmail,
            subject: 'Confirmar cambio de email - RecetAR',
            html,
        };

        await this.emailService.send(mailOptions);
    }

    private async sendEmailChangeNotification(user: IUser, oldEmail: string, newEmail: string) {
        if (!this.emailService || !this.emailTemplateService) { return; }

        const extras = {
            titulo: 'Cambio de email',
            usuario: user,
            oldEmail,
            newEmail,
            dateTime: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
            url: this.appDomain,
        };

        const html = await this.emailTemplateService.render('emails/email-change.html', extras);
        const mailOptions: MailOptions = {
            from: process.env.EMAIL_USERNAME || '',
            to: oldEmail,
            subject: 'Notificación de cambio de email - RecetAR',
            html,
        };
        await this.emailService.send(mailOptions);

        const htmlNew = await this.emailTemplateService.render('emails/email-change.html', extras);
        const mailOptionsNew: MailOptions = {
            from: process.env.EMAIL_USERNAME || '',
            to: newEmail,
            subject: 'Confirmación de cambio de email - RecetAR',
            html: htmlNew,
        };
        await this.emailService.send(mailOptionsNew);
    }
}
