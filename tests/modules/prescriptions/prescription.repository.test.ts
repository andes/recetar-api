import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PrescriptionRepository } from '../../../src/modules/prescriptions/prescription.repository';
import Prescription from '../../../src/modules/prescriptions/prescription.model';

jest.setTimeout(15000);

let repository: PrescriptionRepository;

beforeAll(async () => {
    await connectTestDB();
    repository = new PrescriptionRepository();
    await Prescription.init();
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

function build(overrides: Record<string, unknown> = {}) {
    return {
        patient: { firstName: 'Juan', lastName: 'Pérez', dni: '12345678', sex: 'Masculino' },
        professional: { userId: '000000000000000000000001', businessName: 'Dr. Gómez' },
        supplies: [{ supply: { name: 'Ibuprofeno 400mg' }, quantity: 10 }],
        status: 'Pendiente',
        date: new Date(),
        ...overrides,
    };
}

describe('PrescriptionRepository · identificadores externos', () => {
    it('adds an external identifier', async () => {
        const created = await repository.create(build() as any);

        const updated = await repository.addExternalIdentifier(created._id.toString(), 'praxis', 'ID-1');

        expect(updated?.identificadoresExternos).toHaveLength(1);
        expect(updated?.identificadoresExternos?.[0]).toMatchObject({ entidad: 'praxis', valor: 'ID-1' });
    });

    it('upserts without duplicating the same entity', async () => {
        const created = await repository.create(build() as any);
        await repository.addExternalIdentifier(created._id.toString(), 'praxis', 'ID-1');

        const updated = await repository.addExternalIdentifier(created._id.toString(), 'praxis', 'ID-2');

        expect(updated?.identificadoresExternos).toHaveLength(1);
        expect(updated?.identificadoresExternos?.[0].valor).toBe('ID-2');
    });

    it('keeps distinct entities', async () => {
        const created = await repository.create(build() as any);
        await repository.addExternalIdentifier(created._id.toString(), 'praxis', 'ID-1');
        await repository.addExternalIdentifier(created._id.toString(), 'prestacion', 'PREST-1');
        const updated = await repository.addExternalIdentifier(created._id.toString(), 'registro', 'REG-1');

        expect(updated?.identificadoresExternos).toHaveLength(3);
    });

    it('finds prescriptions by external identifier (multiple docs may share it)', async () => {
        const a = await repository.create(build() as any);
        const b = await repository.create(build() as any);
        await repository.addExternalIdentifier(a._id.toString(), 'prestacion', 'PREST-1');
        await repository.addExternalIdentifier(b._id.toString(), 'prestacion', 'PREST-1');

        const found = await repository.findByExternalIdentifier('prestacion', 'PREST-1');

        expect(found).toHaveLength(2);
    });

    it('uses the compound multikey index for the identifier search', async () => {
        const indexes = await Prescription.collection.indexes();
        expect(indexes.some(index => index.name === 'identificadoresExternos_entidad_valor')).toBe(true);

        const explain = await Prescription.find({
            identificadoresExternos: { $elemMatch: { entidad: 'prestacion', valor: 'PREST-1' } },
        }).explain('executionStats') as any;

        const plan = JSON.stringify(explain);
        expect(plan).toContain('IXSCAN');
    });

    it('updates syncExterno state', async () => {
        const created = await repository.create(build() as any);

        const updated = await repository.updateSyncExterno(created._id.toString(), {
            praxis: { estado: 'pendiente', intentos: 1 },
        });

        expect(updated?.syncExterno?.praxis?.estado).toBe('pendiente');
        expect(updated?.syncExterno?.praxis?.intentos).toBe(1);
    });

    it('finds prescriptions by praxis-receta hash', async () => {
        const a = await repository.create(build() as any);
        const b = await repository.create(build() as any);
        await repository.addExternalIdentifier(a._id.toString(), 'praxis-receta', 'RECETA-1');
        await repository.addExternalIdentifier(b._id.toString(), 'praxis-receta', 'RECETA-1');

        const found = await repository.findByExternalIdentifier('praxis-receta', 'RECETA-1');

        expect(found).toHaveLength(2);
    });

    it('finds prescriptions by praxis idAtencion and idPrescripcion', async () => {
        const doc = await repository.create(build({
            syncExterno: {
                praxis: {
                    estado: 'ok',
                    intentos: 0,
                    idPrescripcion: 'PRAX-1',
                    idAtencion: 'AT-1',
                },
            },
        }) as any);

        const byAtencion = await repository.findByPraxisIdAtencion('AT-1');
        const byPrescripcion = await repository.findByPraxisIdPrescripcion('PRAX-1');

        expect(byAtencion.map(d => d._id.toString())).toEqual([doc._id.toString()]);
        expect(byPrescripcion.map(d => d._id.toString())).toEqual([doc._id.toString()]);
    });

    it('persists praxis metadata and numeroAutorizacion', async () => {
        const doc = await repository.create(build({
            syncExterno: {
                praxis: {
                    estado: 'ok',
                    intentos: 0,
                    idPrescripcion: 'PRAX-1',
                    idAtencion: 'AT-1',
                    idReceta: 'REC-1',
                    numeroReceta: '10015',
                    cuirs: ['CUIR-1'],
                    contenidoQR: 'QR-1',
                    observacion: 'ok',
                },
            },
            estadoDispensaActual: { tipo: 'dispensada', numeroAutorizacion: 'OPF-1' },
            dispensa: [{ descripcion: 'Ibuprofeno', cantidad: 1, sistema: 'praxis', numeroAutorizacion: 'OPF-1' }],
        }) as any);

        const found = await repository.findById(doc._id.toString());
        const praxis = found?.syncExterno?.praxis;

        expect(praxis?.idPrescripcion).toBe('PRAX-1');
        expect(praxis?.idAtencion).toBe('AT-1');
        expect(praxis?.idReceta).toBe('REC-1');
        expect(praxis?.numeroReceta).toBe('10015');
        expect(praxis?.cuirs).toHaveLength(1);
        expect(praxis?.cuirs?.[0]).toBe('CUIR-1');
        expect(praxis?.contenidoQR).toBe('QR-1');
        expect(found?.estadoDispensaActual?.numeroAutorizacion).toBe('OPF-1');
        expect(found?.dispensa?.[0].numeroAutorizacion).toBe('OPF-1');
    });
});
