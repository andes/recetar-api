import { AndesClient, AndesMapper } from '../../integrations/andes';
import type { AndesContacto, AndesDireccion, AndesMPIPatient, ValidatedPatient } from '../../integrations/andes';
import { Logger } from '../../shared/logger/logger.interface';
import { IPatient, IPatientContacto, IPatientDireccion } from './patients.types';
import { CreatePatientDTO, UpdatePatientDTO, SearchPatientsDTO } from './patients.dto';
import {
    PatientNotFoundError,
    PatientValidationNotFoundError,
    PatientAndesUnavailableError,
    PatientAndesUnauthorizedError,
    InvalidPatientDataError,
    DuplicateDniError,
} from './patients.errors';

export interface PatientSnapshot {
    firstName: string;
    lastName: string;
    dni: string;
    sex: string;
    fechaNac?: Date;
    idMPI?: string;
    [key: string]: unknown;
}

export class PatientService {
    constructor(
        private readonly andesClient: AndesClient,
        private readonly logger: Logger,
    ) {}

    async list(): Promise<IPatient[]> {
        return this.search('');
    }

    async show(id: string): Promise<IPatient> {
        try {
            const patient = await this.andesClient.getPatientFromMPI(id);
            if (!patient) {
                throw new PatientNotFoundError();
            }
            return this.toLocalPatient(patient);
        } catch (error) {
            if (error instanceof PatientNotFoundError) {
                throw error;
            }
            if (this.isNotFound(error)) {
                throw new PatientNotFoundError();
            }
            throw this.andesUnavailable(error);
        }
    }

    async search(term: string, estado = ''): Promise<IPatient[]> {
        const trimmed = term.trim();
        const params = {
            ...(trimmed ? { search: trimmed } : {}),
            ...(estado ? { estado } : {}),
        };
        return (await this.searchInAndes(params)).map((patient) => this.toLocalPatient(patient));
    }

    async searchPage(dto: SearchPatientsDTO): Promise<{ items: IPatient[]; hasMore: boolean; offset: number; limit: number }> {
        const offset = dto.offset ?? 0;
        const limit = dto.limit ?? 20;
        const query = (dto.q || '').trim();
        const patients = await this.searchInAndes({
            ...(query ? { search: query } : {}),
            ...(dto.estado ? { estado: dto.estado } : {}),
            ...(dto.sexo ? { sexo: dto.sexo } : {}),
            ...(dto.email ? { email: dto.email } : {}),
            ...(dto.celular ? { celular: dto.celular } : {}),
            ...(dto.fijo ? { fijo: dto.fijo } : {}),
            skip: offset,
            limit: limit + 1,
        });
        return {
            items: patients.slice(0, limit).map((patient) => this.toLocalPatient(patient)),
            hasMore: patients.length > limit,
            offset,
            limit,
        };
    }

    async findByDni(dni: string, estado = ''): Promise<IPatient[]> {
        const patients = await this.searchInAndes({
            documento: dni,
            ...(estado ? { estado } : {}),
        });
        return patients.map((patient) => this.toLocalPatient(patient));
    }

    async findByDniAndSex(dni: string, sex?: string, estado = ''): Promise<IPatient | null> {
        const normalizedSex = sex ? sex.toLowerCase() : '';
        const patients = await this.searchInAndes({
            documento: dni,
            ...(normalizedSex ? { sexo: normalizedSex } : {}),
            ...(estado ? { estado } : {}),
        });
        if (patients.length === 0) {
            return null;
        }
        return this.toLocalPatient(patients[0]);
    }

    /**
     * Resuelve el paciente contra Andes y devuelve el snapshot a persistir
     * embebido en recetas, certificados y prácticas. Andes es la fuente de verdad.
     */
    async resolveSnapshot(dni: string, sex?: string): Promise<PatientSnapshot | null> {
        const patient = await this.findByDniAndSex(dni, sex);
        if (!patient) {
            return null;
        }
        return this.toSnapshot(patient);
    }

    async resolveSnapshotById(idMPI: string): Promise<PatientSnapshot | null> {
        try {
            const patient = await this.show(idMPI);
            return this.toSnapshot(patient);
        } catch {
            return null;
        }
    }

    async create(dto: CreatePatientDTO): Promise<IPatient> {
        if (!dto.dni) {
            return this.createTemporal(dto);
        }

        const existing = await this.findByDniAndSex(dto.dni, dto.sex, '');
        if (existing) {
            return existing;
        }
        const byDni = await this.findByDni(dto.dni, '');
        if (byDni.length > 0) {
            return byDni[0];
        }

        const validated = await this.validateOrThrow(dto.dni, dto.sex);
        const contactos = this.toAndesContactos(dto.contactos);
        const direcciones = this.toAndesDirecciones(dto.direcciones?.length ? dto.direcciones : validated.direcciones);

        const payload = AndesMapper.toAndesValidatedPatient(
            {
                ...validated,
                nombre: validated.nombre || dto.firstName || '',
                apellido: validated.apellido || dto.lastName || '',
                genero: dto.genero || validated.genero,
            },
            {
                ...(dto.nombreAutopercibido ? { alias: dto.nombreAutopercibido } : {}),
                ...(contactos ? { contacto: contactos } : {}),
                ...(direcciones ? { direccion: direcciones } : {}),
            },
        );

        let created;
        try {
            created = await this.andesClient.createPatientInMPI(payload as unknown as Record<string, unknown>, true);
        } catch (error) {
            throw this.andesUnavailable(error);
        }

        if (AndesMapper.isMPICreateSugeridos(created)) {
            const matches = await this.findByDni(dto.dni, '');
            if (matches.length > 0) {
                return matches[0];
            }
            throw new PatientValidationNotFoundError();
        }

        return this.toLocalPatient(created as AndesMPIPatient);
    }

    private async createTemporal(dto: CreatePatientDTO): Promise<IPatient> {
        const firstName = (dto.firstName || '').trim();
        const lastName = (dto.lastName || '').trim();
        if (!firstName || !lastName) {
            throw new InvalidPatientDataError([
                { field: 'firstName', message: 'El nombre y apellido son obligatorios para un paciente sin DNI' },
            ]);
        }

        const payload = AndesMapper.toAndesTemporalPatient({
            nombre: firstName,
            apellido: lastName,
            sexo: dto.sex,
            ...(dto.genero ? { genero: dto.genero } : {}),
            ...(dto.fechaNac ? { fechaNacimiento: dto.fechaNac } : {}),
            ...(dto.nombreAutopercibido ? { alias: dto.nombreAutopercibido } : {}),
            ...(dto.cuil ? { cuil: dto.cuil } : {}),
            ...(this.toAndesContactos(dto.contactos) ? { contacto: this.toAndesContactos(dto.contactos) } : {}),
            ...(this.toAndesDirecciones(dto.direcciones) ? { direccion: this.toAndesDirecciones(dto.direcciones) } : {}),
        });

        let created;
        try {
            created = await this.andesClient.createPatientInMPI(payload as unknown as Record<string, unknown>, true);
        } catch (error) {
            throw this.andesUnavailable(error);
        }

        return this.toLocalPatient(created as AndesMPIPatient);
    }

    async update(id: string, dto: UpdatePatientDTO): Promise<IPatient> {
        const current = await this.show(id);

        const data: Record<string, unknown> = {};
        if (dto.firstName !== undefined) { data.nombre = dto.firstName; }
        if (dto.lastName !== undefined) { data.apellido = dto.lastName; }
        if (dto.fechaNac !== undefined) { data.fechaNacimiento = dto.fechaNac; }
        if (dto.nombreAutopercibido !== undefined) { data.alias = dto.nombreAutopercibido; }
        if (dto.cuil !== undefined) { data.cuil = dto.cuil; }
        if (dto.genero?.trim()) { data.genero = AndesMapper.normalizeGenero(dto.genero); }

        if (dto.dni && dto.dni !== current.dni) {
            if (current.dni && current.estado === 'validado') {
                throw new InvalidPatientDataError([
                    { field: 'dni', message: 'No se puede modificar el DNI de un paciente validado' },
                ]);
            }
            const duplicate = await this.findByDniAndSex(dto.dni, dto.sex || current.sex, '');
            if (duplicate && duplicate.idMPI !== id) {
                throw new DuplicateDniError();
            }
            data.documento = dto.dni;
        }
        if (dto.sex) {
            data.sexo = dto.sex.toLowerCase();
        }
        if (dto.contactos !== undefined) {
            data.contacto = this.mergeContactos(current.contactos, dto.contactos);
        }
        if (dto.direcciones !== undefined) {
            data.direccion = this.mergeDirecciones(current.direcciones, dto.direcciones);
        }

        try {
            const updated = await this.andesClient.updatePatientInMPI(id, data);
            return this.toLocalPatient(updated);
        } catch (error) {
            if (this.isNotFound(error)) {
                throw new PatientNotFoundError();
            }
            throw this.andesUnavailable(error);
        }
    }

    async validateById(id: string): Promise<IPatient> {
        const patient = await this.show(id);
        if (!patient.dni) {
            throw new InvalidPatientDataError([
                { field: 'dni', message: 'El paciente debe tener DNI para poder validarse' },
            ]);
        }

        const validated = await this.validateOrThrow(patient.dni, patient.sex);
        const direcciones = validated.direcciones?.length
            ? [validated.direcciones[0], ...(patient.direcciones?.slice(1) || [])]
            : undefined;
        const data: Record<string, unknown> = {
            nombre: validated.nombre,
            apellido: validated.apellido,
            sexo: validated.sexo.toLowerCase(),
            ...(validated.fechaNacimiento ? { fechaNacimiento: validated.fechaNacimiento } : {}),
            ...(validated.cuil ? { cuil: validated.cuil } : {}),
            ...(direcciones ? { direccion: this.toAndesDirecciones(direcciones) } : {}),
            estado: 'validado',
        };

        try {
            const updated = await this.andesClient.updatePatientInMPI(id, data);
            return this.toLocalPatient(updated);
        } catch (error) {
            if (this.isNotFound(error)) {
                throw new PatientNotFoundError();
            }
            throw this.andesUnavailable(error);
        }
    }

    async remove(id: string): Promise<void> {
        await this.show(id);
        try {
            await this.andesClient.deletePatientInMPI(id);
        } catch (error) {
            if (this.isNotFound(error)) {
                throw new PatientNotFoundError();
            }
            throw this.andesUnavailable(error);
        }
    }

    async updatePartial(id: string, body: Record<string, unknown>): Promise<IPatient> {
        const allowedFields = ['dni', 'lastName', 'firstName', 'sex'];
        const values: Record<string, unknown> = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                values[field] = body[field];
            }
        }
        return this.update(id, values as UpdatePatientDTO);
    }

    async getCoverages(): Promise<unknown> {
        return this.andesClient.listCoverages();
    }

    async getCoverage(dni: string, sexo: string): Promise<unknown> {
        return this.andesClient.getPatientCoverage(dni, sexo);
    }

    async searchCoverages(query: string): Promise<unknown> {
        return this.andesClient.searchCoverages(query);
    }

    async validateIdentity(dni: string, sexo: string): Promise<ValidatedPatient | null> {
        return this.andesClient.validatePatient(dni, sexo);
    }

    private async validateOrThrow(dni: string, sexo: string): Promise<ValidatedPatient> {
        let validated: ValidatedPatient | null;
        try {
            validated = await this.andesClient.validatePatient(dni, sexo);
        } catch (error) {
            throw this.andesUnavailable(error);
        }
        if (!validated) {
            throw new PatientValidationNotFoundError();
        }
        return validated;
    }

    private async searchInAndes(params: import('../../integrations/andes').AndesMPISearchParams): Promise<AndesMPIPatient[]> {
        try {
            return await this.andesClient.searchPatients(params);
        } catch (error) {
            throw this.andesUnavailable(error);
        }
    }

    private toAndesContactos(contactos?: IPatientContacto[]): AndesContacto[] | undefined {
        if (!contactos?.length) { return undefined; }
        const mapped = contactos
            .filter((contacto) => !!contacto.valor?.trim())
            .map((contacto) => ({
                tipo: contacto.tipo,
                valor: contacto.valor.trim(),
                ranking: contacto.ranking ?? 1,
                activo: contacto.activo ?? true,
                ultimaActualizacion: new Date().toISOString(),
            }));
        return mapped.length ? mapped : undefined;
    }

    private toAndesDirecciones(direcciones?: IPatientDireccion[]): AndesDireccion[] | undefined {
        if (!direcciones?.length) { return undefined; }
        const mapped = direcciones.map((direccion) => ({
            valor: direccion.calle || '',
            codigoPostal: direccion.codigoPostal || '',
            ubicacion: {
                barrio: { nombre: direccion.barrio || '' },
                localidad: { nombre: direccion.localidad || '' },
                provincia: { nombre: direccion.provincia || '' },
                pais: { nombre: direccion.pais || '' },
            },
            ranking: direccion.ranking ?? 1,
            activo: direccion.activo ?? true,
            ultimaActualizacion: new Date().toISOString(),
            ...(direccion.geoReferencia ? { geoReferencia: direccion.geoReferencia } : {}),
            ...(direccion.situacionCalle !== undefined ? { situacionCalle: direccion.situacionCalle } : {}),
        }));
        return mapped.length ? mapped : undefined;
    }

    private mergeContactos(existing: IPatientContacto[] | undefined, incoming: IPatientContacto[]): AndesContacto[] | undefined {
        const base = (existing || []).map((contacto) => ({ ...contacto }));
        for (const contacto of incoming) {
            const index = base.findIndex((item) => item.tipo === contacto.tipo);
            if (!contacto.valor?.trim()) {
                if (index >= 0) { base.splice(index, 1); }
                continue;
            }
            const normalized = {
                tipo: contacto.tipo,
                valor: contacto.valor.trim(),
                ranking: 1,
                activo: true,
            };
            if (index >= 0) {
                base[index] = { ...base[index], ...normalized };
            } else {
                base.push(normalized);
            }
        }
        return this.toAndesContactos(base);
    }

    private mergeDirecciones(existing: IPatientDireccion[] | undefined, incoming: IPatientDireccion[]): AndesDireccion[] | undefined {
        if (!incoming.length) { return undefined; }
        const base = (existing || []).map((direccion) => ({ ...direccion }));
        const update = incoming[0];
        const primary = base[0] || {};
        const merged: IPatientDireccion = {
            ...primary,
            ...(update.calle !== undefined ? { calle: update.calle } : {}),
            ...(update.codigoPostal !== undefined ? { codigoPostal: update.codigoPostal } : {}),
            ...(update.barrio !== undefined ? { barrio: update.barrio } : {}),
            ...(update.localidad !== undefined ? { localidad: update.localidad } : {}),
            ...(update.provincia !== undefined ? { provincia: update.provincia } : {}),
            ...(update.pais !== undefined ? { pais: update.pais } : {}),
            ranking: update.ranking ?? primary.ranking ?? 1,
            activo: update.activo ?? primary.activo ?? true,
        };
        if (base.length) {
            base[0] = merged;
        } else {
            base.push(merged);
        }
        return this.toAndesDirecciones(base);
    }

    private toLocalPatient(patient: AndesMPIPatient): IPatient {
        return AndesMapper.toLocalPatientFromMPI(patient) as unknown as IPatient;
    }

    private toSnapshot(patient: IPatient): PatientSnapshot {
        return {
            firstName: patient.firstName || '',
            lastName: patient.lastName || '',
            dni: patient.dni || '',
            sex: patient.sex || '',
            ...(patient.fechaNac ? { fechaNac: new Date(patient.fechaNac) } : {}),
            ...(patient.idMPI ? { idMPI: patient.idMPI } : {}),
        };
    }

    private isNotFound(error: unknown): boolean {
        const status = (error as { response?: { status?: number } })?.response?.status;
        return status === 404;
    }

    private andesUnavailable(error: unknown): PatientAndesUnavailableError | PatientAndesUnauthorizedError {
        const status = (error as { response?: { status?: number } })?.response?.status;
        const message = (error as Error)?.message || 'unknown error';
        this.logger.logError(new Error(`ANDES MPI error${status ? ` (${status})` : ''}: ${message}`), { status });
        if (status === 401 || status === 403) {
            return new PatientAndesUnauthorizedError();
        }
        return new PatientAndesUnavailableError();
    }
}
