import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PrescriptionRepository } from '../../../src/modules/prescriptions/prescription.repository';
import { PraxisEventsRepository } from '../../../src/modules/praxis-events/praxis-events.repository';
import { PraxisEventsService } from '../../../src/modules/praxis-events/praxis-events.service';
import { PraxisEventNotFoundError } from '../../../src/modules/praxis-events/praxis-events.errors';
import PraxisEvent from '../../../src/modules/praxis-events/praxis-event.model';

jest.setTimeout(15000);

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

let prescriptions: PrescriptionRepository;
let events: PraxisEventsRepository;
let service: PraxisEventsService;

beforeAll(async () => {
    await connectTestDB();
    await PraxisEvent.init();
    prescriptions = new PrescriptionRepository();
    events = new PraxisEventsRepository();
    service = new PraxisEventsService(events, prescriptions, logger as any);
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

function buildDoc(overrides: Record<string, unknown> = {}) {
    return {
        prescriptionId: `P-${Math.random().toString(36).slice(2, 8)}`,
        patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
        professional: { userId: '000000000000000000000001', businessName: 'Dr. Gómez' },
        supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 1 }],
        status: 'Pendiente',
        date: new Date(),
        ...overrides,
    };
}

async function createDoc(overrides: Record<string, unknown> = {}) {
    return prescriptions.create(buildDoc(overrides) as any);
}

function findIdentifier(doc: any, entidad: string, valor: string): boolean {
    return !!doc?.identificadoresExternos?.some((entry: any) => entry.entidad === entidad && entry.valor === valor);
}

describe('PraxisEventsService', () => {
    describe('alta de prescripción', () => {
        it('vincula el hash de receta en el documento encontrado por hash de prescripción', async () => {
            const doc = await createDoc({
                identificadoresExternos: [{ entidad: 'praxis', valor: 'PRESC-1' }],
            });

            const result = await service.handlePrescription({
                id: 10,
                hash: 'PRESC-1',
                idAtencion: 'AT-1',
                recetas: [{ id: 1000, hash: 'REC-1', numero: '100' }],
                renglones: [{ cantidadEnvases: 1, cuir: 'CUIR-1' }],
            } as any);

            const found = await prescriptions.findById(doc._id.toString());
            expect(result.estado).toBe('procesado');
            expect(result.linked).toBe(true);
            expect(findIdentifier(found, 'praxis-receta', 'REC-1')).toBe(true);
            expect(found?.syncExterno?.praxis?.idPrescripcion).toBe('10');
            expect(found?.syncExterno?.praxis?.idAtencion).toBe('AT-1');
            expect(found?.syncExterno?.praxis?.idReceta).toBe('1000');
            expect(found?.syncExterno?.praxis?.cuirs?.[0]).toBe('CUIR-1');
        });

        it('registra el evento como desconocido si no encuentra la prescripción', async () => {
            const result = await service.handlePrescription({
                hash: 'UNKNOWN',
                recetas: [{ hash: 'REC-1' }],
                renglones: [{ cantidadEnvases: 1 }],
            } as any);

            const event = await events.findByClave('prescripcion:UNKNOWN');
            expect(result.estado).toBe('desconocido');
            expect(result.linked).toBe(false);
            expect(event?.estado).toBe('desconocido');
        });

        it('usa idAtencion como fallback de correlación', async () => {
            const doc = await createDoc({
                syncExterno: {
                    praxis: { estado: 'ok', intentos: 0, idAtencion: 'AT-1', idPrescripcion: '10' },
                },
            });

            await service.handlePrescription({
                id: 10,
                hash: 'PRESC-2',
                idAtencion: 'AT-1',
                recetas: [{ hash: 'REC-2' }],
                renglones: [{ cantidadEnvases: 1 }],
            } as any);

            const found = await prescriptions.findById(doc._id.toString());
            expect(findIdentifier(found, 'praxis', 'PRESC-2')).toBe(true);
            expect(findIdentifier(found, 'praxis-receta', 'REC-2')).toBe(true);
        });

        it('usa idPrescripcion como fallback de transición', async () => {
            const doc = await createDoc({
                syncExterno: {
                    praxis: { estado: 'ok', intentos: 0, idPrescripcion: '99' },
                },
            });

            await service.handlePrescription({
                id: 99,
                hash: 'PRESC-3',
                recetas: [{ hash: 'REC-3' }],
                renglones: [{ cantidadEnvases: 1 }],
            } as any);

            const found = await prescriptions.findById(doc._id.toString());
            expect(findIdentifier(found, 'praxis', 'PRESC-3')).toBe(true);
            expect(findIdentifier(found, 'praxis-receta', 'REC-3')).toBe(true);
        });

        it('es idempotente en entregas repetidas', async () => {
            const doc = await createDoc({
                identificadoresExternos: [{ entidad: 'praxis', valor: 'PRESC-4' }],
            });
            const payload = {
                hash: 'PRESC-4',
                recetas: [{ hash: 'REC-4' }],
                renglones: [{ cantidadEnvases: 1 }],
            } as any;

            const first = await service.handlePrescription(payload);
            const second = await service.handlePrescription(payload);

            const found = await prescriptions.findById(doc._id.toString());
            const recetaIds = found?.identificadoresExternos?.filter(entry => entry.entidad === 'praxis-receta') || [];
            expect(first.duplicate).toBe(false);
            expect(second.duplicate).toBe(true);
            expect(second.estado).toBe('procesado');
            expect(recetaIds).toHaveLength(1);
        });
    });

    describe('anulaciones', () => {
        it('anula una receta y deja de estar disponible', async () => {
            const doc = await createDoc({
                identificadoresExternos: [{ entidad: 'praxis-receta', valor: 'REC-1' }],
            });

            const result = await service.annulReceta('REC-1');
            const again = await service.annulReceta('REC-1');
            const found = await prescriptions.findById(doc._id.toString());

            expect(result.estado).toBe('procesado');
            expect(again.duplicate).toBe(true);
            expect(found?.estadoActual?.tipo).toBe('eliminada');
            expect(found?.status).toBe('Rechazada');
        });

        it('anula todos los meses de una prescripción', async () => {
            const first = await createDoc({
                treatmentGroupId: 'TG-1',
                ordenTratamiento: 0,
                identificadoresExternos: [{ entidad: 'praxis', valor: 'PRESC-1' }],
            });
            const second = await createDoc({
                treatmentGroupId: 'TG-1',
                ordenTratamiento: 1,
                identificadoresExternos: [{ entidad: 'praxis', valor: 'PRESC-1' }],
            });

            const result = await service.annulPrescription('PRESC-1');
            const foundFirst = await prescriptions.findById(first._id.toString());
            const foundSecond = await prescriptions.findById(second._id.toString());

            expect(result.affected).toBe(2);
            expect(foundFirst?.estadoActual?.tipo).toBe('eliminada');
            expect(foundSecond?.estadoActual?.tipo).toBe('eliminada');
            expect(foundFirst?.status).toBe('Rechazada');
            expect(foundSecond?.status).toBe('Rechazada');
        });

        it('responde 404 cuando el hash de receta no existe', async () => {
            await expect(service.annulReceta('UNKNOWN')).rejects.toBeInstanceOf(PraxisEventNotFoundError);
        });
    });

    describe('dispensa', () => {
        it('marca dispensada una receta y registra el número de autorización', async () => {
            const doc = await createDoc({
                identificadoresExternos: [{ entidad: 'praxis-receta', valor: 'REC-1' }],
                supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 1 }],
            });

            const result = await service.dispense('REC-1', {
                fecha: '2026-10-29T10:00:00',
                dispensa: {
                    numeroAutorizacion: 'OPF-1',
                    renglones: [{ producto: { descripcion: 'Ibuprofeno' }, cantidadEnvases: 1 }],
                },
            } as any);
            const found = await prescriptions.findById(doc._id.toString());

            expect(result.estado).toBe('procesado');
            expect(found?.estadoDispensaActual?.tipo).toBe('dispensada');
            expect(found?.estadoDispensaActual?.numeroAutorizacion).toBe('OPF-1');
            expect(found?.estadoActual?.tipo).toBe('finalizada');
            expect(found?.status).toBe('Dispensada');
            expect(found?.dispensa?.[0].numeroAutorizacion).toBe('OPF-1');
            expect(found?.dispensa?.[0].sistema).toBe('praxis');
        });

        it('marca dispensa parcial cuando no cubre la cantidad prescripta', async () => {
            const doc = await createDoc({
                identificadoresExternos: [{ entidad: 'praxis-receta', valor: 'REC-2' }],
                supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 2 }],
            });

            await service.dispense('REC-2', {
                dispensa: {
                    numeroAutorizacion: 'OPF-2',
                    renglones: [{ producto: { descripcion: 'Ibuprofeno' }, cantidadEnvases: 1 }],
                },
            } as any);
            const found = await prescriptions.findById(doc._id.toString());

            expect(found?.estadoDispensaActual?.tipo).toBe('dispensa-parcial');
            expect(found?.status).toBe('Dispensada');
            expect(found?.estadoActual?.tipo).not.toBe('finalizada');
        });

        it('no duplica la dispensa en entregas repetidas con la misma autorización', async () => {
            const doc = await createDoc({
                identificadoresExternos: [{ entidad: 'praxis-receta', valor: 'REC-3' }],
            });
            const payload = {
                dispensa: {
                    numeroAutorizacion: 'OPF-3',
                    renglones: [{ producto: { descripcion: 'Ibuprofeno' }, cantidadEnvases: 1 }],
                },
            } as any;

            const first = await service.dispense('REC-3', payload);
            const second = await service.dispense('REC-3', payload);
            const found = await prescriptions.findById(doc._id.toString());

            expect(first.duplicate).toBe(false);
            expect(second.duplicate).toBe(true);
            expect(found?.dispensa).toHaveLength(1);
        });

        it('no duplica si la dispensa ya estaba aplicada', async () => {
            const doc = await createDoc({
                identificadoresExternos: [{ entidad: 'praxis-receta', valor: 'REC-6' }],
                estadoDispensaActual: { tipo: 'dispensada', numeroAutorizacion: 'OPF-6' },
                dispensa: [{
                    descripcion: 'Ibuprofeno',
                    cantidad: 1,
                    sistema: 'praxis',
                    numeroAutorizacion: 'OPF-6',
                }],
                status: 'Dispensada',
            });

            const result = await service.dispense('REC-6', {
                dispensa: {
                    numeroAutorizacion: 'OPF-6',
                    renglones: [{ producto: { descripcion: 'Ibuprofeno' }, cantidadEnvases: 1 }],
                },
            } as any);
            const found = await prescriptions.findById(doc._id.toString());

            expect(result.estado).toBe('procesado');
            expect(found?.dispensa).toHaveLength(1);
        });

        it('responde 404 cuando el hash de receta no existe', async () => {
            await expect(service.dispense('UNKNOWN', {
                dispensa: {
                    numeroAutorizacion: 'OPF-X',
                    renglones: [{ cantidadEnvases: 1 }],
                },
            } as any)).rejects.toBeInstanceOf(PraxisEventNotFoundError);

            const event = await events.findByClave('dispensa:UNKNOWN:OPF-X');
            expect(event?.estado).toBe('desconocido');
        });

        it('anula la dispensa y deja la receta pendiente', async () => {
            const doc = await createDoc({
                identificadoresExternos: [{ entidad: 'praxis-receta', valor: 'REC-4' }],
                estadoDispensaActual: { tipo: 'dispensada', numeroAutorizacion: 'OPF-4' },
                status: 'Dispensada',
            });

            const result = await service.annulDispense('REC-4');
            const found = await prescriptions.findById(doc._id.toString());

            expect(result.estado).toBe('procesado');
            expect(found?.estadoDispensaActual?.tipo).toBe('sin-dispensa');
            expect(found?.estadoDispensaActual?.cancelada?.motivo).toBe('anulada-por-praxis');
            expect(found?.status).toBe('Pendiente');
        });

        it('mantiene Rechazada al anular la dispensa de una receta eliminada', async () => {
            const doc = await createDoc({
                identificadoresExternos: [{ entidad: 'praxis-receta', valor: 'REC-5' }],
                estadoActual: { tipo: 'eliminada', fecha: new Date() },
                estadoDispensaActual: { tipo: 'dispensada', numeroAutorizacion: 'OPF-5' },
                status: 'Rechazada',
            });

            await service.annulDispense('REC-5');
            const found = await prescriptions.findById(doc._id.toString());

            expect(found?.estadoDispensaActual?.tipo).toBe('sin-dispensa');
            expect(found?.status).toBe('Rechazada');
        });
    });
});
