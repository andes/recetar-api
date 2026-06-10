import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import needle from 'needle';
import bcrypt from 'bcryptjs';
import { AuthRepository } from './auth.repository';
import { EmailService, EmailTemplateService, MailOptions } from '../../integrations/email';
import { Logger } from '../../shared/logger/logger.interface';
import {
    InvalidCredentialsError,
    UserNotFoundError,
    UserAlreadyExistsError,
    PasswordExpiredError,
    InvalidLinkError,
    SamePasswordError,
} from './auth.errors';
import { ForbiddenError } from '../../shared/errors';
import {
    RegisterDTO,
    LoginDTO,
    RefreshDTO,
    ResetPasswordDTO,
    RecoverPasswordDTO,
    SetValidationTokenDTO,
    GetTokenDTO,
    GetProfessionalsAndesDTO,
} from './auth.dto';
import { IUser } from '../../models/user.model';

interface TokenPayload {
    iss: string;
    sub: string;
    usrn: string;
    bsname: string;
    rl: string | string[];
    iat: number;
    exp?: number;
}

export class AuthService {
    private readonly jwtSecret: string;
    private readonly tokenLifetime: number;
    private readonly appDomain: string;

    constructor(
        private readonly authRepository: AuthRepository,
        private readonly logger: Logger,
        private readonly emailService?: EmailService,
        private readonly emailTemplateService?: EmailTemplateService,
    ) {
        this.jwtSecret = process.env.JWT_SECRET || '';
        this.tokenLifetime = parseInt(process.env.TOKEN_LIFETIME || '1', 10);
        this.appDomain = process.env.APP_DOMAIN || '';
    }

    async login(dto: LoginDTO): Promise<{ jwt: string; refreshToken: string }> {
        const user = await this.authRepository.findByEmailOrUsername(dto.identifier);
        if (!user) {
            throw new InvalidCredentialsError();
        }

        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch) {
            throw new InvalidCredentialsError();
        }

        if (!user.isActive) {
            throw new InvalidCredentialsError();
        }

        const now = moment();
        if (!user.passwordCreatedAt) {
            user.passwordCreatedAt = now.toDate();
            await this.authRepository.saveUser(user);
        }

        const passwordExpired = moment(user.passwordCreatedAt).add(3, 'months').isBefore(now);
        if (passwordExpired) {
            await this.sendPasswordExpiryNotification(user.username).catch(() => {});
            throw new PasswordExpiredError();
        }

        const roles = user.roles.map(r => r.role || '');
        const token = this.signToken(user._id.toString(), user.username, user.businessName, roles);
        const refreshToken = uuidv4();

        await this.authRepository.updateRefreshToken(user._id.toString(), refreshToken);
        await this.authRepository.updateLastLogin(user._id.toString());

        return { jwt: token, refreshToken };
    }

    async loginWithJwt(userId: string): Promise<{ jwt: string; refreshToken: string }> {
        const user = await this.authRepository.findById(userId);
        if (!user || !user.isActive) {
            throw new UserNotFoundError();
        }

        const roles = user.roles.map(r => r.role || '');
        const token = this.signToken(user._id.toString(), user.username, user.businessName, roles);
        const refreshToken = uuidv4();

        await this.authRepository.updateRefreshToken(user._id.toString(), refreshToken);
        await this.authRepository.updateLastLogin(user._id.toString());

        return { jwt: token, refreshToken };
    }

    async register(dto: RegisterDTO): Promise<IUser> {
        const { username, email, password, businessName, enrollment, cuil, roleType, captcha, profesion, fechaEgreso, fechaMatVencimiento, disposicionHabilitacion, vencimientoHabilitacion } = dto;

        const captchaResp: any = await needle('post', 'https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            secret: process.env.CF_SECRET_KEY,
            response: captcha,
        });
        if (!captchaResp || captchaResp.body.success === false) {
            throw new ForbiddenError('errors.auth.invalidConnection');
        }

        const role = await this.authRepository.findRoleByType(roleType);
        if (!role) {
            throw new ForbiddenError('errors.auth.incompleteBody');
        }

        const existingUser = await this.authRepository.findOneByUsername(username);
        if (existingUser) {
            throw new UserAlreadyExistsError();
        }

        if (roleType === 'professional') {
            return this.registerProfessional(dto, role, password);
        } else if (roleType === 'pharmacist') {
            return this.registerPharmacist(dto, role, password);
        }

        throw new ForbiddenError('errors.forbidden.default');
    }

    private async registerProfessional(dto: RegisterDTO, role: any, rawPassword: string): Promise<IUser> {
        const { username, email, enrollment, cuil, profesion, fechaEgreso, fechaMatVencimiento, businessName } = dto;

        const resp = await needle('get', `${process.env.ANDES_ENDPOINT}/core/tm/profesionales/guia?documento=${username}`);
        if (!(resp.body && resp.body.length > 0 && resp.body[0].profesiones && resp.body[0].profesiones.length > 0)) {
            throw new ForbiddenError('errors.forbidden.default');
        }

        const professionalAndes = resp.body[0];
        const { profesiones } = professionalAndes;
        const profAut = profesiones.filter((p: any) => {
            const validCodes = [1, 2, 23];
            if (!validCodes.includes(p.profesion.codigo)) { return false; }
            const lastMatriculacion = p.matriculacion[p.matriculacion.length - 1];
            return lastMatriculacion && moment(lastMatriculacion.fin) > moment();
        });

        if (!profAut || profAut.length === 0) {
            throw new ForbiddenError('errors.forbidden.default');
        }

        const matchesProfesional = profAut.some((p: any) => {
            const lastMat = p.matriculacion && p.matriculacion.length
                ? p.matriculacion[p.matriculacion.length - 1]
                : null;
            const codigoMatches = p.profesion && profesion && p.profesion.codigo.toString() === profesion.codigoProfesion;
            const fechaEgresoMatches = moment(fechaEgreso).startOf('day').isSame(moment(p.fechaEgreso).startOf('day'));
            const fechaMatVencimientoMatches = lastMat && moment(fechaMatVencimiento).isSame(moment(lastMat.fin), 'day');
            const matriculaMatches = lastMat && lastMat.matriculaNumero && enrollment
                ? lastMat.matriculaNumero.toString() === enrollment.toString()
                : false;
            return codigoMatches && matriculaMatches && fechaEgresoMatches && fechaMatVencimientoMatches;
        });

        if (!matchesProfesional) {
            throw new ForbiddenError('errors.forbidden.default');
        }

        if (!(profAut && cuil === professionalAndes.cuit)) {
            throw new ForbiddenError('errors.forbidden.default');
        }

        const apellidoYNombre = `${professionalAndes.apellido} ${professionalAndes.nombre}`;
        const profesionG = profAut.map((p: any) => ({
            profesion: p.profesion.nombre,
            codigoProfesion: p.profesion.codigo,
            numeroMatricula: p.matriculacion[p.matriculacion.length - 1].matriculaNumero,
        }));

        const newUser = await this.authRepository.createUser({
            username,
            email,
            password: rawPassword,
            enrollment,
            cuil,
            businessName: apellidoYNombre || businessName,
            profesionGrado: profesionG,
            isActive: true,
            roles: [role._id],
        } as any);

        role.users.push(newUser._id);
        await this.authRepository.saveRole(role);

        this.sendEmailNewUser(newUser).catch(err => this.logger.logError(err));

        return newUser;
    }

    private async registerPharmacist(dto: RegisterDTO, role: any, rawPassword: string): Promise<IUser> {
        const { username, email, enrollment, cuil, businessName, disposicionHabilitacion, vencimientoHabilitacion } = dto;

        const resp = await needle('get', `${process.env.ANDES_ENDPOINT}/core/tm/farmacias?cuit=${username}&disposicionHabilitacion=${disposicionHabilitacion}`, {
            headers: { Authorization: process.env.JWT_MPI_TOKEN },
        });

        if (!(resp.body && resp.body.length > 0)) {
            throw new ForbiddenError('errors.forbidden.default');
        }

        const pharmacyAndes = resp.body[0];
        const checkDisposicionFarmacia = pharmacyAndes.disposicionHabilitacion === disposicionHabilitacion;
        const checkMatricula = pharmacyAndes.matriculaDTResponsable === enrollment;
        const diferencia = moment(vencimientoHabilitacion).diff(pharmacyAndes.vencimientoHabilitacion, 'days');

        if (!(checkDisposicionFarmacia && checkMatricula && diferencia === 0)) {
            throw new ForbiddenError('errors.forbidden.default');
        }

        const newUser = await this.authRepository.createUser({
            username,
            email,
            password: rawPassword,
            enrollment,
            cuil,
            businessName,
            isActive: true,
            roles: [role._id],
        } as any);

        role.users.push(newUser._id);
        await this.authRepository.saveRole(role);

        this.sendEmailNewUser(newUser).catch(err => this.logger.logError(err));

        return newUser;
    }

    async logout(refreshToken: string): Promise<void> {
        await this.authRepository.clearRefreshToken(refreshToken);
    }

    async refresh(dto: RefreshDTO): Promise<{ jwt: string; refreshToken: string }> {
        const user = await this.authRepository.findOneByRefreshToken(dto.refreshToken);
        if (!user) {
            throw new InvalidCredentialsError();
        }

        const roles = user.roles.map(r => r.role || '');
        const token = this.signToken(user._id.toString(), user.username, user.businessName, roles);
        const nextRefreshToken = uuidv4();

        await this.authRepository.updateRefreshToken(user._id.toString(), nextRefreshToken);

        return { jwt: token, refreshToken: nextRefreshToken };
    }

    async resetPassword(userId: string, dto: ResetPasswordDTO): Promise<void> {
        const user = await this.authRepository.findById(userId);
        if (!user) {
            throw new UserNotFoundError();
        }

        const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
        if (!isMatch) {
            throw new InvalidCredentialsError();
        }

        user.password = dto.newPassword;
        user.passwordCreatedAt = new Date();
        user.authenticationToken = undefined;
        user.passwordChangeTokenExpiry = undefined;
        await this.authRepository.saveUser(user);
    }

    async recoverPassword(dto: RecoverPasswordDTO): Promise<void> {
        const user = await this.authRepository.findOneByAuthenticationToken(dto.authenticationToken);
        if (!user || !user.passwordChangeTokenExpiry || moment(user.passwordChangeTokenExpiry).isBefore(moment())) {
            throw new InvalidLinkError();
        }

        const isMatch = await bcrypt.compare(dto.newPassword, user.password);
        if (isMatch) {
            throw new SamePasswordError();
        }

        user.password = dto.newPassword;
        user.passwordCreatedAt = new Date();
        user.authenticationToken = undefined;
        user.passwordChangeTokenExpiry = undefined;
        await this.authRepository.saveUser(user);
    }

    async setValidationTokenAndNotify(dto: SetValidationTokenDTO): Promise<void> {
        const user = await this.authRepository.findOneByUsername(dto.usuario);
        if (!user || !this.emailService || !this.emailTemplateService) {
            return;
        }

        user.authenticationToken = uuidv4();
        user.passwordChangeTokenExpiry = undefined;
        await this.authRepository.saveUser(user);

        const extras = {
            titulo: 'Recuperación de contraseña',
            usuario: user,
            url: `${this.appDomain}/auth/recovery-password/${user.authenticationToken}`,
        };

        const html = await this.emailTemplateService.render('emails/recover-password.html', extras);
        const mailOptions: MailOptions = {
            from: process.env.EMAIL_USERNAME || '',
            to: user.email,
            subject: 'Recuperación de contraseña',
            html,
        };

        await this.emailService.send(mailOptions);
    }

    async getToken(dto: GetTokenDTO): Promise<{ jwt: string }> {
        const user = await this.authRepository.findOneByUsername(dto.username);
        if (!user) {
            throw new UserNotFoundError();
        }

        const roles = user.roles.map(r => r.role || '');
        const now = moment().unix();
        const token = jwt.sign({
            iss: 'recetar.andes',
            sub: user._id.toString(),
            usrn: user.username,
            bsname: user.businessName,
            rl: roles,
            iat: now,
        } as TokenPayload, this.jwtSecret, { algorithm: 'HS256' });

        return { jwt: token };
    }

    async getPharmacyAndes(cuil: string, disposicionHabilitacion: string): Promise<any> {
        const resp = await needle('get', `${process.env.ANDES_ENDPOINT}/core/tm/farmacias?cuit=${cuil}&disposicionHabilitacion=${disposicionHabilitacion}`, {
            headers: { Authorization: process.env.JWT_MPI_TOKEN },
        });
        return resp.body;
    }

    async getProfessionalsAndes(dto: GetProfessionalsAndesDTO): Promise<any> {
        const { documento, matricula, cuil, fechaEgreso, fechaMatVencimiento, profesionCodigo } = dto;

        const resp = await needle('get', `${process.env.ANDES_ENDPOINT}/core/tm/profesionales/guia?documento=${documento}`);
        if (!resp.body || resp.body.length === 0) {
            throw new UserNotFoundError();
        }

        const profesional = resp.body[0];
        if (matricula || cuil || fechaEgreso || fechaMatVencimiento || profesionCodigo) {
            const validated = this.validateProfessional(profesional, matricula, cuil, fechaEgreso, fechaMatVencimiento, profesionCodigo);
            if (!validated) {
                throw new UserNotFoundError();
            }
        }

        return resp.body;
    }

    async getAuthorizedProfessions(): Promise<any> {
        const { default: ProfesionAutorizada } = await import('../../models/profesionAutorizada.model');
        return ProfesionAutorizada.find().exec();
    }

    private validateProfessional(
        profesional: any,
        enrollment?: string,
        cuil?: string,
        graduationDate?: string,
        enrollmentExpiration?: string,
        profesionCodigo?: string,
    ): boolean {
        if (!profesional || !profesional.profesiones || profesional.profesiones.length === 0 || !profesionCodigo) {
            return false;
        }
        try {
            const lastProfesion = profesional.profesiones.find((p: any) => p.profesion.codigo === profesionCodigo);
            const lastMatriculacion = lastProfesion && lastProfesion.matriculacion && lastProfesion.matriculacion.length
                ? lastProfesion.matriculacion[lastProfesion.matriculacion.length - 1]
                : null;
            if (lastMatriculacion) {
                let res = moment(lastMatriculacion.fin) > moment();
                res = res && lastMatriculacion.matriculaNumero.toString() === enrollment;
                res = res && profesional.cuit === cuil;
                res = res && moment(lastMatriculacion.fin).format('DD-MM-YYYY') === enrollmentExpiration;
                res = res && moment(lastProfesion.fechaEgreso).format('DD-MM-YYYY') === graduationDate;
                return res;
            }
            return false;
        } catch {
            return false;
        }
    }

    private signToken(userId: string, username: string, businessName: string, role: string | string[]): string {
        const now = moment().unix();
        return jwt.sign({
            iss: 'recetar.andes',
            sub: userId,
            usrn: username,
            bsname: businessName,
            rl: role,
            iat: now,
            exp: now + moment.duration(this.tokenLifetime, 'hours').asSeconds(),
        } as TokenPayload, this.jwtSecret, { algorithm: 'HS256' });
    }

    private async sendEmailNewUser(newUser: IUser): Promise<void> {
        if (!this.emailService || !this.emailTemplateService) { return; }

        const extras = {
            titulo: 'Nuevo usuario',
            usuario: newUser,
        };

        const html = await this.emailTemplateService.render('emails/new-user.html', extras);
        const mailOptions: MailOptions = {
            from: process.env.EMAIL_USERNAME || '',
            to: newUser.email,
            subject: 'Nuevo Usuario RecetAR',
            html,
        };

        await this.emailService.send(mailOptions);
    }

    private async sendPasswordExpiryNotification(username: string): Promise<void> {
        if (!this.emailService || !this.emailTemplateService) { return; }

        const usuario = await this.authRepository.findOneByUsername(username);
        if (!usuario) { return; }

        const authenticationToken = uuidv4();
        const tokenExpiry = moment().endOf('day').add(72, 'hours').toDate();

        usuario.authenticationToken = authenticationToken;
        usuario.passwordChangeTokenExpiry = tokenExpiry;
        await this.authRepository.saveUser(usuario);

        const extras = {
            titulo: 'Contraseña Vencida - Cambio Requerido',
            usuario,
            url: `${this.appDomain}/auth/recovery-password/${authenticationToken}`,
            expiryDate: moment(tokenExpiry).format('DD/MM/YYYY'),
        };

        const html = await this.emailTemplateService.render('emails/password-expired.html', extras);
        const mailOptions: MailOptions = {
            from: process.env.EMAIL_USERNAME || '',
            to: usuario.email,
            subject: 'Contraseña Vencida - Cambio Requerido',
            text: 'Su contraseña ha vencido y debe ser cambiada. Por favor, haga clic en el enlace proporcionado para cambiar su contraseña.',
            html,
        };

        await this.emailService.send(mailOptions);
    }

    async getRoleTypes(): Promise<any[]> {
        return this.authRepository.findAllRoles();
    }
}
