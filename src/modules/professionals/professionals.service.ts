import { ProfessionalRepository } from './professionals.repository';
import { IProfessional, IProfesionGrado } from './professionals.types';
import { Logger } from '../../shared/logger/logger.interface';
import { ProfessionalCuilRequiredError, ProfessionalFormationRequiredError } from './professionals.errors';
import { AndesClient, AndesMapper, SyncableProfessional } from '../../integrations/andes';
import { UsersRepository } from '../users/users.repository';
import { isValidCuitCuil, normalizeTaxId } from '../../shared/utils/tax-id';
import { Types } from 'mongoose';

export class ProfessionalService {
    constructor(
        private readonly professionalRepository: ProfessionalRepository,
        private readonly usersRepository: UsersRepository,
        private readonly andesClient: AndesClient | undefined,
        private readonly logger: Logger,
    ) {}

    async getByUserId(userId: string): Promise<IProfessional | null> {
        return this.professionalRepository.findByUserId(userId);
    }

    async getByDocumento(documento: string): Promise<IProfessional | null> {
        return this.professionalRepository.findByDocumento(documento);
    }

    async saveFromAndes(
        userId: string,
        documento: string,
        sync: SyncableProfessional,
    ): Promise<IProfessional | null> {
        return this.professionalRepository.upsertByUserId(userId, {
            userId: new Types.ObjectId(userId),
            tipoDocumento: sync.tipoDocumento || 'DNI',
            documento,
            nombre: sync.firstName || '',
            apellido: sync.lastName || '',
            sexo: sync.sexo,
            cuit: sync.cuit,
            profesionGrado: sync.profesionGrado,
            actualizadoEn: new Date(),
        });
    }

    async refresh(userId: string, documento: string): Promise<IProfessional | null> {
        if (!this.andesClient || !documento) {
            return null;
        }
        const profesional = await this.andesClient.getProfessionalFormacion(documento);
        if (!profesional) {
            return null;
        }
        const sync = AndesMapper.toSyncableProfessional(profesional);
        if (!sync.profesionGrado?.length) {
            return null;
        }
        return this.saveFromAndes(userId, documento, sync);
    }

    // Devuelve el perfil cacheado; si no existe, lo consulta a ANDES y lo guarda.
    async getOrRefresh(userId: string): Promise<IProfessional | null> {
        const profile = await this.professionalRepository.findByUserId(userId);
        if (profile) {
            return profile;
        }
        const user = await this.usersRepository.findById(userId);
        if (!user?.username) {
            return null;
        }
        return this.refresh(userId, user.username);
    }

    // Devuelve el profesional; si no hay formación/matrícula o CUIT/CUIL, lanza 422.
    async requireForUser(userId: string): Promise<IProfessional> {
        const profile = await this.getOrRefresh(userId);
        if (!profile || !this.hasMatricula(profile.profesionGrado)) {
            throw new ProfessionalFormationRequiredError();
        }
        const cuit = await this.resolveCuit(profile);
        if (!cuit) {
            throw new ProfessionalCuilRequiredError();
        }
        profile.cuit = cuit;
        return profile;
    }

    // Prioriza el CUIT/CUIL de ANDES; si falta o es inválido, usa el de la cuenta RecetAr.
    private async resolveCuit(profile: IProfessional): Promise<string | undefined> {
        if (isValidCuitCuil(profile.cuit)) {
            return normalizeTaxId(profile.cuit);
        }
        const user = await this.usersRepository.findById(profile.userId.toString());
        if (isValidCuitCuil(user?.cuil)) {
            return normalizeTaxId(user?.cuil);
        }
        return undefined;
    }

    private hasMatricula(profesionGrado?: IProfesionGrado[]): boolean {
        return !!profesionGrado?.length && profesionGrado.some((entry) => !!entry.numeroMatricula);
    }
}
