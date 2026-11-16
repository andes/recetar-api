import { PrescriptionRepository } from '../prescriptions/prescription.repository';
import {
    IPrescription,
    IExternalSyncEntity,
} from '../prescriptions/prescription.types';
import { Logger } from '../../shared/logger/logger.interface';
import { PraxisEventsRepository } from './praxis-events.repository';
import { PraxisDispensaEntry, PraxisEventsMapper } from './praxis-events.mapper';
import { PraxisEventNotFoundError } from './praxis-events.errors';
import {
    IPraxisEvent,
    PraxisEventResult,
    PraxisEventState,
    PraxisEventType,
    PraxisEventoDispensa,
    PraxisEventoPrescripcion,
} from './praxis-events.types';

export class PraxisEventsService {
    constructor(
        private readonly eventsRepository: PraxisEventsRepository,
        private readonly prescriptionRepository: PrescriptionRepository,
        private readonly logger: Logger,
    ) {}

    async handlePrescription(payload: PraxisEventoPrescripcion): Promise<PraxisEventResult> {
        const { event, duplicate, alreadyProcessed } = await this.record(
            'prescripcion',
            payload.hash,
            payload as unknown as Record<string, unknown>,
        );
        if (alreadyProcessed) {
            return this.result(payload.hash, duplicate, 'procesado', !!event.prescriptionId);
        }

        const docs = await this.resolvePrescription(payload);
        if (!docs.length) {
            await this.updateState(event, 'desconocido');
            return this.result(payload.hash, duplicate, 'desconocido', false);
        }

        try {
            await this.bindRecetas(docs, payload);
            await this.updateState(event, 'procesado', docs[0]._id.toString());
            return this.result(payload.hash, duplicate, 'procesado', true, docs.length);
        } catch (error) {
            await this.updateState(event, 'error');
            throw error;
        }
    }

    async annulPrescription(hash: string): Promise<PraxisEventResult> {
        const { event, duplicate, alreadyProcessed } = await this.record(
            'anulacion-prescripcion',
            hash,
            { hash },
        );
        if (alreadyProcessed) {
            return this.result(hash, duplicate, 'procesado', !!event.prescriptionId);
        }

        const docs = await this.prescriptionRepository.findByExternalIdentifier('praxis', hash);
        if (!docs.length) {
            await this.updateState(event, 'desconocido');
            throw new PraxisEventNotFoundError();
        }

        try {
            for (const doc of docs) {
                await this.annulDoc(doc);
            }
            await this.updateState(event, 'procesado', docs[0]._id.toString());
            return this.result(hash, duplicate, 'procesado', true, docs.length);
        } catch (error) {
            await this.updateState(event, 'error');
            throw error;
        }
    }

    async annulReceta(hash: string): Promise<PraxisEventResult> {
        const { event, duplicate, alreadyProcessed } = await this.record(
            'anulacion-receta',
            hash,
            { hash },
            { recetaHash: hash },
        );
        if (alreadyProcessed) {
            return this.result(hash, duplicate, 'procesado', !!event.prescriptionId);
        }

        const docs = await this.prescriptionRepository.findByExternalIdentifier('praxis-receta', hash);
        if (!docs.length) {
            await this.updateState(event, 'desconocido');
            throw new PraxisEventNotFoundError();
        }

        try {
            await this.annulDoc(docs[0]);
            await this.updateState(event, 'procesado', docs[0]._id.toString());
            return this.result(hash, duplicate, 'procesado', true, 1);
        } catch (error) {
            await this.updateState(event, 'error');
            throw error;
        }
    }

    async dispense(hash: string, payload: PraxisEventoDispensa): Promise<PraxisEventResult> {
        const numeroAutorizacion = payload.dispensa.numeroAutorizacion;
        const { event, duplicate, alreadyProcessed } = await this.record(
            'dispensa',
            hash,
            payload as unknown as Record<string, unknown>,
            { recetaHash: hash, numeroAutorizacion, claveSuffix: numeroAutorizacion },
        );
        if (alreadyProcessed) {
            return this.result(hash, duplicate, 'procesado', !!event.prescriptionId);
        }

        const docs = await this.prescriptionRepository.findByExternalIdentifier('praxis-receta', hash);
        if (!docs.length) {
            await this.updateState(event, 'desconocido');
            throw new PraxisEventNotFoundError();
        }

        const doc = docs[0];
        if (docs.length > 1) {
            this.logger.logWarn(`Praxis dispensa ${hash}: ${docs.length} documentos comparten el hash de receta; se usa el primero`);
        }
        if (doc.dispensa?.some(entry => entry.numeroAutorizacion === numeroAutorizacion)) {
            await this.updateState(event, 'procesado', doc._id.toString());
            return this.result(hash, duplicate, 'procesado', true, 1);
        }

        try {
            const entries = PraxisEventsMapper.toDispensaEntries(payload);
            const required = this.requiredQuantity(doc);
            const previous = (doc.dispensa || []).reduce((sum, entry) => sum + (entry.cantidad || 0), 0);
            const delivered = previous + entries.reduce((sum, entry) => sum + (entry.cantidad || 0), 0);
            const tipo = required > 0 && delivered < required ? 'dispensa-parcial' : 'dispensada';
            const fecha = payload.fecha ? new Date(payload.fecha) : new Date();
            const status = doc.estadoActual?.tipo === 'eliminada' ? 'Rechazada' : 'Dispensada';
            const estadoDispensa = {
                tipo,
                fecha,
                sistema: 'praxis',
                numeroAutorizacion,
            };

            await this.prescriptionRepository.pushDispensa(
                doc._id.toString(),
                estadoDispensa,
                entries as unknown as Record<string, unknown>[],
                status,
            );
            if (tipo === 'dispensada' && status !== 'Rechazada') {
                await this.prescriptionRepository.pushEstado(
                    doc._id.toString(),
                    { tipo: 'finalizada', fecha },
                    'Dispensada',
                );
            }
            await this.updateState(event, 'procesado', doc._id.toString());
            return this.result(hash, duplicate, 'procesado', true, 1);
        } catch (error) {
            await this.updateState(event, 'error');
            throw error;
        }
    }

    async annulDispense(hash: string): Promise<PraxisEventResult> {
        const { event, duplicate, alreadyProcessed } = await this.record(
            'anulacion-dispensa',
            hash,
            { hash },
            { recetaHash: hash },
        );
        if (alreadyProcessed) {
            return this.result(hash, duplicate, 'procesado', !!event.prescriptionId);
        }

        const docs = await this.prescriptionRepository.findByExternalIdentifier('praxis-receta', hash);
        if (!docs.length) {
            await this.updateState(event, 'desconocido');
            throw new PraxisEventNotFoundError();
        }

        const doc = docs[0];
        if (doc.estadoDispensaActual?.tipo === 'sin-dispensa'
            && doc.estadoDispensaActual.cancelada?.motivo === 'anulada-por-praxis') {
            await this.updateState(event, 'procesado', doc._id.toString());
            return this.result(hash, duplicate, 'procesado', true, 1);
        }

        try {
            const fecha = new Date();
            const status = doc.estadoActual?.tipo === 'eliminada' ? 'Rechazada' : 'Pendiente';
            await this.prescriptionRepository.pushDispensa(
                doc._id.toString(),
                {
                    tipo: 'sin-dispensa',
                    fecha,
                    sistema: 'praxis',
                    cancelada: { motivo: 'anulada-por-praxis', fecha },
                },
                null,
                status,
            );
            await this.updateState(event, 'procesado', doc._id.toString());
            return this.result(hash, duplicate, 'procesado', true, 1);
        } catch (error) {
            await this.updateState(event, 'error');
            throw error;
        }
    }

    private async record(
        tipo: PraxisEventType,
        hash: string,
        payload: Record<string, unknown>,
        options: { recetaHash?: string; numeroAutorizacion?: string; claveSuffix?: string } = {},
    ): Promise<{ event: IPraxisEvent; duplicate: boolean; alreadyProcessed: boolean }> {
        const claveIdempotencia = options.claveSuffix
            ? `${tipo}:${hash}:${options.claveSuffix}`
            : `${tipo}:${hash}`;

        const { event, duplicate } = await this.eventsRepository.record({
            claveIdempotencia,
            tipo,
            hash,
            ...(options.recetaHash ? { recetaHash: options.recetaHash } : {}),
            ...(options.numeroAutorizacion ? { numeroAutorizacion: options.numeroAutorizacion } : {}),
            payload,
            estado: 'error',
        });

        return {
            event,
            duplicate,
            alreadyProcessed: duplicate && event.estado === 'procesado',
        };
    }

    private async resolvePrescription(payload: PraxisEventoPrescripcion): Promise<IPrescription[]> {
        const byHash = await this.prescriptionRepository.findByExternalIdentifier('praxis', payload.hash);
        if (byHash.length) {
            return this.sortByOrder(byHash);
        }

        if (payload.idAtencion) {
            const byAtencion = await this.prescriptionRepository.findByPraxisIdAtencion(payload.idAtencion);
            if (byAtencion.length) {
                return this.sortByOrder(byAtencion);
            }
        }

        if (payload.id != null) {
            const byId = await this.prescriptionRepository.findByPraxisIdPrescripcion(String(payload.id));
            if (byId.length) {
                return this.sortByOrder(byId);
            }
        }

        return [];
    }

    private async bindRecetas(
        docs: IPrescription[],
        payload: PraxisEventoPrescripcion,
    ): Promise<void> {
        const ordered = this.sortByOrder(docs);
        const recetas = payload.recetas || [];
        const idAtencion = payload.idAtencion
            || ordered[0]?.treatmentGroupId
            || ordered[0]?.prescriptionId;
        const observacion = recetas.length < ordered.length
            ? `Praxis emitió ${recetas.length} receta(s) para ${ordered.length} mes(es)`
            : undefined;

        for (let index = 0; index < ordered.length; index++) {
            const doc = ordered[index];
            const receta = recetas[index];
            const docId = doc._id.toString();

            await this.prescriptionRepository.addExternalIdentifier(docId, 'praxis', payload.hash);
            if (receta?.hash) {
                await this.prescriptionRepository.addExternalIdentifier(docId, 'praxis-receta', receta.hash);
            }

            const metadata = receta
                ? PraxisEventsMapper.toRecetaMetadata(receta, payload.renglones)
                : {};

            await this.mergePraxisMetadata(doc, {
                estado: 'ok',
                ...(payload.id != null ? { idPrescripcion: String(payload.id) } : {}),
                ...(idAtencion ? { idAtencion } : {}),
                ...metadata,
                ...(observacion ? { observacion } : {}),
            });
        }
    }

    private async annulDoc(doc: IPrescription): Promise<void> {
        if (doc.estadoActual?.tipo === 'eliminada') {
            return;
        }
        await this.prescriptionRepository.pushEstado(
            doc._id.toString(),
            {
                tipo: 'eliminada',
                fecha: new Date(),
                motivo: 'anulada-por-praxis',
            },
            'Rechazada',
        );
    }

    private async mergePraxisMetadata(
        doc: IPrescription,
        updates: Partial<IExternalSyncEntity>,
    ): Promise<void> {
        const existing = doc.syncExterno?.praxis;
        const plain = existing && typeof (existing as unknown as { toObject?: () => unknown }).toObject === 'function'
            ? (existing as unknown as { toObject: () => Record<string, unknown> }).toObject()
            : ((existing || {}) as Record<string, unknown>);
        const merged: Record<string, unknown> = {
            ...plain,
            ...(updates as Record<string, unknown>),
        };
        merged.estado = merged.estado || 'ok';
        merged.intentos = merged.intentos ?? 0;

        await this.prescriptionRepository.updateSyncExterno(doc._id.toString(), {
            praxis: merged as unknown as IExternalSyncEntity,
        });
    }

    private requiredQuantity(doc: IPrescription): number {
        return (doc.supplies || []).reduce(
            (sum, supply) => sum + (supply.quantity || 0),
            0,
        );
    }

    private sortByOrder(docs: IPrescription[]): IPrescription[] {
        return [...docs].sort((a, b) => (a.ordenTratamiento ?? 0) - (b.ordenTratamiento ?? 0));
    }

    private async updateState(
        event: IPraxisEvent,
        estado: PraxisEventState,
        prescriptionId?: string,
    ): Promise<void> {
        await this.eventsRepository.update(event._id.toString(), {
            estado,
            ...(prescriptionId ? { prescriptionId } : {}),
        });
    }

    private result(
        hash: string,
        duplicate: boolean,
        estado: PraxisEventState,
        linked: boolean,
        affected?: number,
    ): PraxisEventResult {
        return {
            hash,
            duplicate,
            estado,
            linked,
            ...(affected != null ? { affected } : {}),
        };
    }
}

export type { PraxisDispensaEntry };
