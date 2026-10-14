import jwt from 'jsonwebtoken';
import moment from 'moment';
import { ApplicationRepository } from './applications.repository';
import { IApplication, IApplicationOrganization } from './applications.types';
import { ApplicationNotFoundError, ApplicationInactiveError } from './applications.errors';
import { Logger } from '../../shared/logger/logger.interface';
import { CreateApplicationDTO, IssueApplicationTokenDTO } from './applications.dto';

export interface AppTokenPayload {
    iss: string;
    app: { id: string; nombre: string };
    organizacion?: IApplicationOrganization;
    permisos: string[];
    isAppToken: true;
    iat: number;
    exp: number;
}

export interface IssuedApplicationToken {
    jwt: string;
    expiresInHours: number;
    appId: string;
    nombre: string;
}

export class ApplicationService {
    private readonly jwtSecret: string;
    private readonly defaultExpiresInHours: number;

    constructor(
        private readonly applicationRepository: ApplicationRepository,
        private readonly logger: Logger,
    ) {
        this.jwtSecret = process.env.JWT_SECRET || '';
        this.defaultExpiresInHours = parseInt(process.env.APP_TOKEN_LIFETIME_HOURS || '720', 10);
    }

    async create(dto: CreateApplicationDTO): Promise<IApplication> {
        const application = await this.applicationRepository.create({
            nombre: dto.nombre,
            organizacion: dto.organizacion,
            permisos: dto.permisos,
            activo: true,
        });
        this.logger.logInfo(`[applications] creada aplicación ${application.nombre}`);
        return application;
    }

    async findById(id: string): Promise<IApplication | null> {
        return this.applicationRepository.findById(id);
    }

    async issueToken(appId: string, dto: IssueApplicationTokenDTO = {} as IssueApplicationTokenDTO): Promise<IssuedApplicationToken> {
        const application = await this.applicationRepository.findById(appId);
        if (!application) {
            throw new ApplicationNotFoundError();
        }
        if (!application.activo) {
            throw new ApplicationInactiveError();
        }

        const expiresInHours = dto.expiresInHours ?? this.defaultExpiresInHours;
        const now = moment().unix();
        const payload: AppTokenPayload = {
            iss: 'recetar.andes',
            app: { id: application._id.toString(), nombre: application.nombre },
            ...(application.organizacion ? { organizacion: application.organizacion } : {}),
            permisos: application.permisos,
            isAppToken: true,
            iat: now,
            exp: now + moment.duration(expiresInHours, 'hours').asSeconds(),
        };

        const token = jwt.sign(payload, this.jwtSecret, { algorithm: 'HS256' });
        await this.applicationRepository.updateToken(application._id.toString(), token);

        this.logger.logInfo(`[applications] token emitido para ${application.nombre}`);
        return {
            jwt: token,
            expiresInHours,
            appId: application._id.toString(),
            nombre: application.nombre,
        };
    }
}
