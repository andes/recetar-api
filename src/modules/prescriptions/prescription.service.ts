import { Types } from 'mongoose';
import { PrescriptionRepository } from './prescription.repository';
import { AndesClient, PrescriptionAndesRepository, PrescriptionAndesNotFoundError } from '../../integrations/andes';
import { PatientService } from '../patients';
import type { PatientSnapshot } from '../patients';
import { Logger } from '../../shared/logger/logger.interface';
import { IPrescription, PRESCRIPTION_SEARCH_LIMIT, PrescriptionDispenser } from './prescription.types';
import { IPrescriptionAndes } from '../../integrations/andes';
import {
    CreatePrescriptionDTO, UpdatePrescriptionDTO,
    DispensePrescriptionDTO,
} from './prescription.dto';
import { AndesDispenseDTO, AndesCancelDispenseDTO, AndesSuspendDTO } from '../../integrations/andes';
import {
    PrescriptionNotFoundError,
    PrescriptionAlreadyDispensedError,
    PrescriptionNotDispensableError,
    PrescriptionCancelTimeExceededError,
    PrescriptionAlreadyCancelledError,
    TreatmentRequiresMedicationsError,
} from './prescription.errors';
import { PatientNotFoundError } from '../patients/patients.errors';
import { generatePrescriptionId, mapPrescriptionStatus, normalizeCuil, addDays } from './prescription.utils';
import { UsersRepository } from '../users/users.repository';
import { AndesPrescription } from '../../integrations/andes/andes.types';
import { PraxisClient, PraxisMapper } from '../../integrations/praxis';
import { AndesIngestDTO } from './ingest.dto';
import { toRecetaCompatible } from '../../integrations/andes/receta-output.mapper';

export class PrescriptionService {
    constructor(
        private readonly prescriptionRepository: PrescriptionRepository,
        private readonly prescriptionAndesRepository: PrescriptionAndesRepository,
        private readonly andesClient: AndesClient,
        private readonly patientServiceProvider: PatientService | (() => PatientService),
        private readonly logger: Logger,
        private readonly usersRepository: UsersRepository,
        private readonly praxisClient?: PraxisClient,
    ) {}

    private get patientService(): PatientService {
        return typeof this.patientServiceProvider === 'function'
            ? this.patientServiceProvider()
            : this.patientServiceProvider;
    }

    async index(
        skip = 0,
        limit = 20,
        filters?: { status?: string; sexo?: string; dateFrom?: string; dateTo?: string; searchTerm?: string },
    ): Promise<{ prescriptions: IPrescription[]; total: number }> {
        await this.prescriptionRepository.expireOldPrescriptions();
        return this.prescriptionRepository.findWithFilters(filters, skip, limit);
    }

    async show(id: string): Promise<IPrescription> {
        const prescription = await this.prescriptionRepository.findById(id);
        if (!prescription) {
            throw new PrescriptionNotFoundError();
        }
        return prescription;
    }

    async getByUserId(
        userId: string,
        ambito?: string,
        skip = 0,
        limit = 20,
        filters?: { patient?: string; dateFrom?: string; dateTo?: string; status?: string }
    ): Promise<{ prescriptions: (IPrescription | AndesPrescription)[]; total: number }> {
        await this.prescriptionRepository.expireOldPrescriptions();

        const local = await this.prescriptionRepository.findByUserId(userId, skip, limit, filters);

        if (ambito === 'publico') {
            try {
                const andesResult = await this.andesClient.getPrescriptionsByProfessional({
                    professionalId: userId,
                });
                const combined = [...local.prescriptions, ...andesResult.map((p) => ({ ...p, isFromAndes: true }))];
                combined.sort((a, b) => {
                    const dateA = (a as IPrescription).createdAt || (a as AndesPrescription).fechaRegistro;
                    const dateB = (b as IPrescription).createdAt || (b as AndesPrescription).fechaRegistro;
                    return new Date(dateB).getTime() - new Date(dateA).getTime();
                });
                return { prescriptions: combined, total: local.total + andesResult.length };
            } catch (error) {
                this.logger.logError(new Error('Error fetching ANDES prescriptions'));
                return { prescriptions: local.prescriptions, total: local.total };
            }
        }

        return { prescriptions: local.prescriptions, total: local.total };
    }

    async searchByUserId(
        userId: string,
        searchTerm: string,
        skip = 0,
        limit = 20,
    ): Promise<{ prescriptions: IPrescription[]; total: number }> {
        await this.prescriptionRepository.expireOldPrescriptions();
        return this.prescriptionRepository.searchByUserId(userId, searchTerm, skip, limit);
    }

    async findByPatient(
        dni: string,
        startDate?: string,
        endDate?: string,
        status?: string,
        sexo?: string,
        skip = 0,
        limit = 20,
    ): Promise<{ prescriptions: (IPrescription | AndesPrescription)[]; total: number }> {
        await this.prescriptionRepository.expireOldPrescriptions();

        const mappedStatus = mapPrescriptionStatus(status);
        const cappedLimit = Math.max(0, Math.min(limit, PRESCRIPTION_SEARCH_LIMIT - skip));
        const local = await this.prescriptionRepository.findByPatientDniAndDateRange(
            dni, startDate, endDate, mappedStatus, sexo, skip, cappedLimit,
        );

        try {
            const andesResult = await this.andesClient.getPrescriptionsByDni({
                dni,
                sexo,
                status,
                dateFrom: startDate,
                dateTo: endDate,
            });
            const remaining = Math.max(0, cappedLimit - local.prescriptions.length);
            const andesCapped = andesResult.slice(0, remaining);
            return {
                prescriptions: [...local.prescriptions, ...andesCapped.map((p) => ({ ...p, isFromAndes: true }))],
                total: Math.min(local.total + andesResult.length, PRESCRIPTION_SEARCH_LIMIT),
            };
        } catch {
            return { prescriptions: local.prescriptions, total: Math.min(local.total, PRESCRIPTION_SEARCH_LIMIT) };
        }
    }

    async getDispensedByCuil(
        cuil: string,
        skip = 0,
        limit = 20,
    ): Promise<{ prescriptions: IPrescription[]; total: number; dispenser: PrescriptionDispenser | null }> {
        const matches = await this.usersRepository.findByCuilOrUsername(cuil);
        const userIds = matches.map((match) => match._id);
        const result = await this.prescriptionRepository.findByDispensedByCuilOrUserIds(cuil, userIds, skip, limit);
        return { ...result, dispenser: this.resolveDispenser(matches, result.prescriptions) };
    }

    private resolveDispenser(
        matches: Array<{ _id: Types.ObjectId; businessName?: string; cuil?: string; username?: string; email?: string }>,
        prescriptions: IPrescription[],
    ): PrescriptionDispenser | null {
        if (matches.length) {
            const match = matches[0];
            return {
                _id: match._id.toString(),
                businessName: match.businessName,
                cuil: match.cuil,
                username: match.username,
                email: match.email,
            };
        }
        const fallback = prescriptions[0]?.dispensedBy;
        if (fallback) {
            return {
                _id: fallback.userId ? fallback.userId.toString() : undefined,
                businessName: fallback.businessName,
                cuil: fallback.cuil,
            };
        }
        return null;
    }

    async create(dto: CreatePrescriptionDTO): Promise<IPrescription> {
        const now = new Date(dto.date || new Date());
        const prescriptions: IPrescription[] = [];
        const patientSnapshot = await this.resolvePatient(dto);
        const fallbackMonths = dto.tratamientoProlongado ?? (dto.trimestral ? 3 : undefined);

        for (const supply of dto.supplies) {
            const meses = this.resolveTreatmentMonths(supply, fallbackMonths);
            const treatmentGroupId = meses ? new Types.ObjectId().toString() : undefined;
            const dates = [now];
            if (meses && meses > 1) {
                for (let i = 1; i < meses; i++) {
                    dates.push(addDays(now, i * 30));
                }
            }

            const supplyDocs: IPrescription[] = [];
            for (let index = 0; index < dates.length; index++) {
                const date = dates[index];
                const patient = { ...dto.patient, ...patientSnapshot } as IPrescription['patient'];
                if (supply.obraSocial?.nombre) {
                    patient.obraSocial = {
                        nombre: supply.obraSocial.nombre,
                        codigoPuco: supply.obraSocial.codigoPuco,
                        numeroAfiliado: supply.obraSocial.numeroAfiliado,
                    };
                }
                const data: Partial<IPrescription> = {
                    prescriptionId: generatePrescriptionId(date),
                    patient,
                    professional: {
                        ...dto.professional,
                    },
                    supplies: [supply],
                    status: 'Pendiente',
                    date,
                    ambito: dto.ambito || 'privado',
                    ...(meses ? { tratamientoProlongado: meses, ordenTratamiento: index } : {}),
                    ...(treatmentGroupId ? { treatmentGroupId } : {}),
                    organizacion: dto.organizacion,
                };
                const created = await this.prescriptionRepository.create(data);
                prescriptions.push(created);
                supplyDocs.push(created);
            }

            await this.syncSupplyToPraxis(supplyDocs, supply);
        }

        const firstCreated = await this.prescriptionRepository.findById(prescriptions[0]._id.toString());
        return firstCreated || prescriptions[0];
    }

    private async syncSupplyToPraxis(
        docs: IPrescription[],
        supply: { supply?: { type?: string } },
    ): Promise<void> {
        if (!docs.length) {
            return;
        }

        const eligible = !supply.supply?.type;
        if (!eligible) {
            for (const doc of docs) {
                await this.prescriptionRepository.updateSyncExterno(doc._id.toString(), {
                    praxis: { estado: 'no_aplicable', intentos: 0 },
                });
            }
            return;
        }

        if (!this.praxisClient) {
            for (const doc of docs) {
                await this.prescriptionRepository.updateSyncExterno(doc._id.toString(), {
                    praxis: { estado: 'pendiente', intentos: 0 },
                });
            }
            return;
        }

        try {
            const payload = PraxisMapper.toPraxisFromDoc(docs[0]);
            const response = await this.praxisClient.createPrescription(payload);
            const warnings = (response.mensajes || []).filter(mensaje => mensaje.severidad !== 'E');
            for (const warning of warnings) {
                this.logger.logWarn(`Praxis: ${warning.mensaje || warning.codigo || 'aviso sin detalle'}`);
            }
            await this.prescriptionRepository.savePraxisResponse(docs, response, 0);
        } catch (error) {
            this.logger.logError(new Error(`Praxis sync failed: ${(error as Error).message}`));
            for (const doc of docs) {
                await this.prescriptionRepository.updateSyncExterno(doc._id.toString(), {
                    praxis: { estado: 'pendiente', intentos: 0, ultimoError: (error as Error).message },
                });
            }
        }
    }

    async ingest(dto: AndesIngestDTO): Promise<IPrescription[]> {
        const medicamento = dto.medicamento;
        const esMagistral = !!medicamento?.esMagistral;
        const conceptId = !esMagistral
            ? (medicamento?.concepto?.conceptId || medicamento?.generico?.conceptId)
            : undefined;
        const magistralNombre = esMagistral ? medicamento?.magistral?.nombre : undefined;

        const existing = await this.prescriptionRepository.findByRegistroAndConcept(dto.idRegistro, conceptId, magistralNombre);
        if (existing) {
            return [existing];
        }

        const meses = this.ingestTreatmentMonths(medicamento);
        const treatmentGroupId = meses ? new Types.ObjectId().toString() : undefined;
        const now = new Date(dto.fechaRegistro || new Date());

        const supply = this.buildIngestSupply(medicamento, dto.diagnostico);
        const patient = this.buildPatientFromIngest(dto.paciente);
        const professional = this.buildProfessionalFromIngest(dto.profesional);

        const docs: IPrescription[] = [];
        const count = meses || 1;
        for (let index = 0; index < count; index++) {
            const date = addDays(now, index * 30);
            const data: Partial<IPrescription> = {
                prescriptionId: generatePrescriptionId(date),
                patient,
                professional,
                supplies: [supply],
                status: 'Pendiente',
                date,
                ambito: 'publico',
                ...(meses ? { tratamientoProlongado: meses, ordenTratamiento: index } : {}),
                ...(treatmentGroupId ? { treatmentGroupId } : {}),
                ...(dto.organizacion ? { organizacion: { _id: dto.organizacion.id, nombre: dto.organizacion.nombre } } : {}),
            };
            const created = await this.prescriptionRepository.create(data);
            await this.prescriptionRepository.addExternalIdentifier(created._id.toString(), 'prestacion', dto.idPrestacion);
            await this.prescriptionRepository.addExternalIdentifier(created._id.toString(), 'registro', dto.idRegistro);
            docs.push(created);
        }

        await this.syncSupplyToPraxis(docs, supply);

        const refreshed: IPrescription[] = [];
        for (const doc of docs) {
            const found = await this.prescriptionRepository.findById(doc._id.toString());
            if (found) {
                refreshed.push(found);
            }
        }
        return refreshed;
    }

    private ingestTreatmentMonths(medicamento: AndesIngestDTO['medicamento']): number | undefined {
        if (!medicamento?.tratamientoProlongado) {
            return undefined;
        }
        const months = parseInt(medicamento?.tiempoTratamiento?.id || '', 10);
        return Number.isFinite(months) && months > 1 ? months : undefined;
    }

    private buildIngestSupply(
        medicamento: AndesIngestDTO['medicamento'],
        diagnostic?: string,
    ): IPrescription['supplies'][number] {
        const esMagistral = !!medicamento?.esMagistral;
        const conceptId = !esMagistral
            ? (medicamento?.concepto?.conceptId || medicamento?.generico?.conceptId)
            : undefined;
        const term = !esMagistral
            ? (medicamento?.concepto?.term || medicamento?.generico?.term)
            : undefined;

        return {
            supply: esMagistral
                ? { name: medicamento?.magistral?.nombre || '', type: 'magistral' }
                : {
                    name: term || '',
                    ...(conceptId ? { code: { source: 'SNOMED' as const, value: conceptId } } : {}),
                },
            quantity: medicamento?.cantEnvases || 1,
            quantityPresentation: medicamento?.cantidad || 1,
            diagnostic: diagnostic || 'Sin diagnóstico',
            indication: medicamento?.dosisDiaria?.notaMedica || '',
        };
    }

    private buildPatientFromIngest(paciente: AndesIngestDTO['paciente']): IPrescription['patient'] {
        return {
            firstName: paciente?.nombre || '',
            lastName: paciente?.apellido || '',
            dni: paciente?.documento || '',
            sex: paciente?.sexo || '',
            ...(paciente?.fechaNacimiento ? { fechaNac: new Date(paciente.fechaNacimiento) } : {}),
            ...(paciente?.id ? { idMPI: paciente.id } : {}),
            ...(paciente?.obraSocial ? { obraSocial: { nombre: paciente.obraSocial.nombre, numeroAfiliado: paciente.obraSocial.numeroAfiliado } } : {}),
        };
    }

    private buildProfessionalFromIngest(profesional: AndesIngestDTO['profesional']): IPrescription['professional'] {
        return {
            businessName: `${profesional?.apellido || ''}, ${profesional?.nombre || ''}`.trim(),
            ...(profesional?.matricula ? { enrollment: profesional.matricula } : {}),
            ...(profesional?.matricula ? { profesionGrado: [{ numeroMatricula: profesional.matricula }] } : {}),
        };
    }

    private resolveTreatmentMonths(
        supply: CreatePrescriptionDTO['supplies'][number],
        fallbackMonths?: number,
    ): number | undefined {
        const isInsumo = supply.supply?.type === 'device' || supply.supply?.type === 'nutrition';

        if (supply.tratamientoProlongado != null) {
            if (isInsumo) {
                throw new TreatmentRequiresMedicationsError();
            }
            return supply.tratamientoProlongado;
        }

        if (fallbackMonths != null && !isInsumo) {
            return fallbackMonths;
        }

        return undefined;
    }

    private async resolvePatient(dto: CreatePrescriptionDTO): Promise<PatientSnapshot> {
        const snapshot = await this.patientService.resolveSnapshot(dto.patient.dni, dto.patient.sex);
        if (!snapshot) {
            throw new PatientNotFoundError();
        }
        return snapshot;
    }

    async update(id: string, dto: UpdatePrescriptionDTO): Promise<IPrescription> {
        const prescription = await this.prescriptionRepository.findById(id);
        if (!prescription) {
            throw new PrescriptionNotFoundError();
        }
        if (prescription.status !== 'Pendiente') {
            throw new PrescriptionNotDispensableError();
        }

        const data: Partial<IPrescription> = {
            ...dto as unknown as Partial<IPrescription>,
            ...(dto.date ? { date: new Date(dto.date) } : {}),
        };
        const updated = await this.prescriptionRepository.update(id, data);
        if (!updated) {
            throw new PrescriptionNotFoundError();
        }
        return updated;
    }

    async delete(id: string): Promise<void> {
        const prescription = await this.prescriptionRepository.findById(id);
        if (!prescription) {
            throw new PrescriptionNotFoundError();
        }
        if (prescription.status !== 'Pendiente') {
            throw new PrescriptionNotDispensableError();
        }
        await this.prescriptionRepository.delete(id);
    }

    async dispense(id: string, dto: DispensePrescriptionDTO): Promise<IPrescription> {
        const prescription = await this.prescriptionRepository.findById(id);
        if (!prescription) {
            throw new PrescriptionNotFoundError();
        }
        if (prescription.status !== 'Pendiente') {
            throw new PrescriptionNotDispensableError();
        }

        const updated = await this.prescriptionRepository.update(id, {
            $set: {
                status: 'Dispensada',
                dispensedBy: {
                    userId: dto.userId,
                    businessName: dto.businessName,
                    cuil: normalizeCuil(dto.cuil),
                },
                dispensedAt: new Date(),
                ...this.buildReplacementData(prescription, dto),
            },
        } as unknown as Partial<IPrescription>);

        if (!updated || updated.status !== 'Dispensada') {
            throw new PrescriptionNotDispensableError();
        }
        return updated;
    }

    private buildReplacementData(
        prescription: IPrescription,
        dto: DispensePrescriptionDTO,
    ): Partial<IPrescription> {
        if (!dto.replacement) {
            return {};
        }

        const plain = (prescription as unknown as { toObject(): Record<string, unknown> }).toObject() as unknown as IPrescription;
        const original = plain.supplies?.[0];
        const originalSupply = original?.supply;
        const replacement = dto.replacement;

        const replacedMedication: Partial<IPrescription>['replacedMedication'] = {
            name: originalSupply?.name,
            quantity: original?.quantity,
            supply: originalSupply,
        };

        const newSupply: IPrescription['supplies'][number]['supply'] = {
            ...(originalSupply || {}),
            name: replacement.name || originalSupply?.name,
        };

        const supplies = (plain.supplies || []).map((entry, index) => {
            if (index !== 0) {
                return entry;
            }
            return {
                ...entry,
                supply: newSupply,
                quantity: replacement.quantity ?? entry.quantity,
            };
        });

        return { replacedMedication, supplies };
    }

    async cancelDispense(id: string, userId: string, isAdmin = false): Promise<IPrescription> {
        const prescription = await this.prescriptionRepository.findById(id);
        if (!prescription) {
            throw new PrescriptionNotFoundError();
        }
        if (prescription.status !== 'Dispensada') {
            throw new PrescriptionAlreadyCancelledError();
        }

        if (!isAdmin && prescription.dispensedAt) {
            const twoHours = 2 * 60 * 60 * 1000;
            if (Date.now() - new Date(prescription.dispensedAt).getTime() > twoHours) {
                throw new PrescriptionCancelTimeExceededError();
            }
        }

        const updated = await this.prescriptionRepository.update(id, {
            status: 'Pendiente',
            $unset: { dispensedBy: '', dispensedAt: '' },
        } as unknown as Partial<IPrescription>);

        if (!updated) {
            throw new PrescriptionNotFoundError();
        }
        return updated;
    }

    async getAndesPrescription(id: string): Promise<IPrescriptionAndes> {
        const local = await this.prescriptionAndesRepository.findById(id);
        if (local) { return local; }

        const byAndesId = await this.prescriptionAndesRepository.findByIdAndes(id);
        if (byAndesId) { return byAndesId; }

        throw new PrescriptionAndesNotFoundError();
    }

    async andesDispense(dto: AndesDispenseDTO): Promise<IPrescriptionAndes> {
        const existing = await this.prescriptionAndesRepository.findByIdAndes(dto.recetaId);
        if (existing) {
            throw new PrescriptionAlreadyDispensedError();
        }

        const created = await this.prescriptionAndesRepository.create({
            idAndes: dto.recetaId,
            estadoDispensaActual: { tipo: 'dispensada' },
            dispensa: [{
                descripcion: dto.descripcion,
                cantidad: dto.cantidad,
                organizacion: dto.organizacion,
            }],
        } as Partial<IPrescriptionAndes>);

        try {
            await this.andesClient.updatePrescription({
                op: 'dispensar',
                recetaId: dto.recetaId,
                descripcion: dto.descripcion,
                cantidad: dto.cantidad,
            } as Record<string, unknown>);
        } catch (error) {
            this.logger.logError(new Error('ANDES dispense failed, keeping local record'));
        }

        return created;
    }

    async andesCancelDispense(dto: AndesCancelDispenseDTO): Promise<void> {
        const local = await this.prescriptionAndesRepository.findByIdAndes(dto.recetaId);
        if (!local) {
            throw new PrescriptionAndesNotFoundError();
        }

        await this.prescriptionAndesRepository.deleteByIdAndes(dto.recetaId);

        try {
            await this.andesClient.updatePrescription({
                op: 'cancelar-dispensa',
                recetaId: dto.recetaId,
                idDispensaApp: dto.idDispensaApp,
                ...(dto.motivo && { motivo: dto.motivo }),
            } as Record<string, unknown>);
        } catch (error) {
            this.logger.logError(new Error('ANDES cancel dispense failed'));
        }
    }

    async andesSuspend(dto: AndesSuspendDTO): Promise<void> {
        const local = await this.prescriptionAndesRepository.findByIdAndes(dto.recetaId);
        if (local) {
            await this.prescriptionAndesRepository.deleteByIdAndes(dto.recetaId);
        }

        try {
            await this.andesClient.suspendPrescription({
                op: 'suspender',
                recetaId: dto.recetaId,
                motivo: dto.motivo,
                ...(dto.observacion && { observacion: dto.observacion }),
                fecha: new Date().toISOString(),
            });
        } catch (error) {
            this.logger.logError(new Error('ANDES suspend failed'));
            throw error;
        }
    }

    async verifyAndesReceta(dni: string, conceptId: string, sexo: string): Promise<{ local: IPrescriptionAndes[]; andes: unknown }> {
        const local = await this.prescriptionAndesRepository.findByDocumentAndConcept(dni, conceptId);
        let andesResult: unknown = [];
        try {
            andesResult = await this.andesClient.verificarRecetaExistente(dni, conceptId, sexo);
        } catch (error) {
            this.logger.logError(new Error('ANDES verify failed'));
        }
        return { local, andes: andesResult };
    }

    async getRecetasPorPrestacion(idPrestacion: string): Promise<Record<string, unknown>[]> {
        const docs = await this.prescriptionRepository.findByPrestacion(idPrestacion);
        return docs.map(toRecetaCompatible);
    }

    async getRecetasPorPaciente(dni: string, ambito?: string): Promise<Record<string, unknown>[]> {
        const docs = await this.prescriptionRepository.findByPacienteAmbito(dni, ambito);
        return docs.map(toRecetaCompatible);
    }

    async getRecetasPorProfesional(id: string): Promise<Record<string, unknown>[]> {
        const result = await this.prescriptionRepository.findByUserId(id, 0, 100);
        return result.prescriptions.map(toRecetaCompatible);
    }

    async getRecetasCompatibles(filtros?: {
        documento?: string;
        estado?: string;
        fechaInicio?: string;
        fechaFin?: string;
    }): Promise<Record<string, unknown>[]> {
        const mappedEstado = mapPrescriptionStatus(filtros?.estado);
        const docs = await this.prescriptionRepository.findRecetasHub({ ...filtros, estado: mappedEstado });
        return docs.map(toRecetaCompatible);
    }

    getMotivos(): Array<{ label: string; descripcion: string }> {
        return [
            { label: 'vencimiento', descripcion: 'Receta vencida' },
            { label: 'error', descripcion: 'Error en la receta' },
            { label: 'otro', descripcion: 'Otro motivo' },
        ];
    }

    async getVerificar(dni: string, conceptId: string, sexo: string): Promise<Record<string, unknown>[]> {
        const docs = await this.prescriptionRepository.findByPacienteAmbito(dni, 'todas');
        const matches = docs.filter(doc =>
            doc.supplies?.some(s => s.supply?.code?.value === conceptId) &&
            (!sexo || doc.patient?.sex?.toLowerCase() === sexo.toLowerCase()),
        );
        return matches.map(toRecetaCompatible);
    }

    async patchReceta(op: string, body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
        const id = body.recetaId as string;
        if (!id) {
            throw new PrescriptionNotFoundError();
        }
        const doc = await this.prescriptionRepository.findByIdOrPrescriptionId(id);
        if (!doc) {
            throw new PrescriptionNotFoundError();
        }

        switch (op) {
            case 'suspender': {
                const updated = await this.prescriptionRepository.pushEstado(doc._id.toString(), {
                    tipo: 'suspendida',
                    fecha: new Date(),
                    motivo: body.motivo as string | undefined,
                    observacion: body.observacion as string | undefined,
                }, 'Suspendida');
                return updated ? toRecetaCompatible(updated) : null;
            }
            case 'rechazar': {
                const updated = await this.prescriptionRepository.pushEstado(doc._id.toString(), {
                    tipo: 'rechazada',
                    fecha: new Date(),
                }, 'Rechazada');
                return updated ? toRecetaCompatible(updated) : null;
            }
            case 'dispensar': {
                const estadoDispensa = { tipo: 'dispensada', fecha: new Date(), sistema: body.sistema as string | undefined };
                const dispensa = { descripcion: body.descripcion as string | undefined, cantidad: body.cantidad as number | undefined, fecha: new Date(), sistema: body.sistema as string | undefined };
                const updated = await this.prescriptionRepository.pushDispensa(doc._id.toString(), estadoDispensa, dispensa, 'Dispensada');
                if (updated) {
                    await this.prescriptionRepository.pushEstado(doc._id.toString(), { tipo: 'finalizada', fecha: new Date() }, 'Dispensada');
                }
                return updated ? toRecetaCompatible(updated) : null;
            }
            case 'cancelar-dispensa': {
                const updated = await this.prescriptionRepository.pushDispensa(doc._id.toString(), {
                    tipo: 'sin-dispensa', fecha: new Date(), sistema: body.sistema as string | undefined,
                }, null, 'Pendiente');
                return updated ? toRecetaCompatible(updated) : null;
            }
            case 'sin-dispensar': {
                const updated = await this.prescriptionRepository.pushDispensa(doc._id.toString(), {
                    tipo: 'sin-dispensa', fecha: new Date(), sistema: body.sistema as string | undefined,
                }, null, doc.status);
                return updated ? toRecetaCompatible(updated) : null;
            }
            case 'dispensa-parcial': {
                const updated = await this.prescriptionRepository.pushDispensa(doc._id.toString(), {
                    tipo: 'dispensa-parcial', fecha: new Date(), sistema: body.sistema as string | undefined,
                }, {
                    descripcion: body.descripcion as string | undefined,
                    cantidad: body.cantidad as number | undefined,
                    fecha: new Date(),
                    sistema: body.sistema as string | undefined,
                }, 'Dispensada');
                return updated ? toRecetaCompatible(updated) : null;
            }
            default:
                throw new PrescriptionNotDispensableError();
        }
    }

    async recordDispensa(
        id: string,
        dto: { tipo?: 'dispensada' | 'dispensa-parcial'; sistema?: string; cantidad?: number; descripcion?: string },
    ): Promise<Record<string, unknown> | null> {
        const doc = await this.prescriptionRepository.findByIdOrPrescriptionId(id);
        if (!doc) {
            throw new PrescriptionNotFoundError();
        }
        const tipo = dto.tipo || 'dispensada';
        const estadoDispensa = { tipo, fecha: new Date(), sistema: dto.sistema };
        const dispensa = {
            descripcion: dto.descripcion,
            cantidad: dto.cantidad,
            fecha: new Date(),
            sistema: dto.sistema,
        };

        const updated = await this.prescriptionRepository.pushDispensa(doc._id.toString(), estadoDispensa, dispensa, 'Dispensada');
        if (tipo === 'dispensada') {
            await this.prescriptionRepository.pushEstado(doc._id.toString(), { tipo: 'finalizada', fecha: new Date() }, 'Dispensada');
        }
        return updated ? toRecetaCompatible(updated) : null;
    }
}
