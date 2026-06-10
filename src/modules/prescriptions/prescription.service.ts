import { PrescriptionRepository } from './prescription.repository';
import { AndesClient, PrescriptionAndesRepository, PrescriptionAndesNotFoundError } from '../../integrations/andes';
import { Logger } from '../../shared/logger/logger.interface';
import { IPrescription } from './prescription.types';
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
} from './prescription.errors';
import { generatePrescriptionId } from './prescription.utils';
import { AndesPrescription } from '../../integrations/andes/andes.types';

export class PrescriptionService {
    constructor(
        private readonly prescriptionRepository: PrescriptionRepository,
        private readonly prescriptionAndesRepository: PrescriptionAndesRepository,
        private readonly andesClient: AndesClient,
        private readonly logger: Logger,
    ) {}

    async index(skip = 0, limit = 20): Promise<{ prescriptions: IPrescription[]; total: number }> {
        return this.prescriptionRepository.findAll(skip, limit);
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
    ): Promise<{ prescriptions: (IPrescription | AndesPrescription)[]; total: number }> {
        await this.prescriptionRepository.expireOldPrescriptions();

        const local = await this.prescriptionRepository.findByUserId(userId, skip, limit);

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
                return { prescriptions: combined.slice(skip, skip + limit), total: combined.length };
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
        skip = 0,
        limit = 20,
    ): Promise<{ prescriptions: (IPrescription | AndesPrescription)[]; total: number }> {
        await this.prescriptionRepository.expireOldPrescriptions();

        const local = await this.prescriptionRepository.findByPatientDniAndDateRange(
            dni, startDate, endDate, status, skip, limit,
        );

        try {
            const andesResult = await this.andesClient.getPrescriptionsByDni({
                dni,
                sexo: '',
                status,
                dateFrom: startDate,
                dateTo: endDate,
            });
            return {
                prescriptions: [...local.prescriptions, ...andesResult.map((p) => ({ ...p, isFromAndes: true }))],
                total: local.total + andesResult.length,
            };
        } catch {
            return { prescriptions: local.prescriptions, total: local.total };
        }
    }

    async getDispensedByCuil(cuil: string, skip = 0, limit = 20): Promise<{ prescriptions: IPrescription[]; total: number }> {
        return this.prescriptionRepository.findByDispensedByCuil(cuil, skip, limit);
    }

    async create(dto: CreatePrescriptionDTO): Promise<IPrescription> {
        const now = new Date(dto.date || new Date());
        const prescriptions: IPrescription[] = [];

        for (const supply of dto.supplies) {
            const data: Partial<IPrescription> = {
                prescriptionId: generatePrescriptionId(now),
                patient: dto.patient as IPrescription['patient'],
                professional: {
                    ...dto.professional,
                    profesionGrado: [],
                },
                supplies: [supply],
                status: 'Pendiente',
                date: now,
                ambito: dto.ambito || 'privado',
                trimestral: dto.trimestral,
                organizacion: dto.organizacion,
            };
            const created = await this.prescriptionRepository.create(data);
            prescriptions.push(created);
        }

        if (dto.trimestral) {
            for (let i = 1; i <= 2; i++) {
                const futureDate = new Date(now);
                futureDate.setDate(futureDate.getDate() + i * 30);
                for (const supply of dto.supplies) {
                    const data: Partial<IPrescription> = {
                        prescriptionId: generatePrescriptionId(futureDate),
                        patient: dto.patient as IPrescription['patient'],
                        professional: {
                            ...dto.professional,
                            profesionGrado: [],
                        },
                        supplies: [supply, { ...supply, triplicate: true, duplicate: true }],
                        status: 'Pendiente',
                        date: futureDate,
                        ambito: dto.ambito || 'privado',
                        trimestral: true,
                        organizacion: dto.organizacion,
                    };
                    await this.prescriptionRepository.create(data);
                }
            }
        }

        return prescriptions[0];
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
            status: 'Dispensada',
            dispensedBy: {
                userId: dto.userId,
                businessName: dto.businessName,
                cuil: dto.cuil,
            },
            dispensedAt: new Date(),
        } as Partial<IPrescription>);

        if (!updated || updated.status !== 'Dispensada') {
            throw new PrescriptionNotDispensableError();
        }
        return updated;
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
}
