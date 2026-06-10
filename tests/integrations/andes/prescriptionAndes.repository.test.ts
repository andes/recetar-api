import mongoose from 'mongoose';
import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import PrescriptionAndes from '../../../src/integrations/andes/prescriptionAndes.model';
import { PrescriptionAndesRepository } from '../../../src/integrations/andes';
import { IPrescriptionAndes } from '../../../src/integrations/andes';

jest.setTimeout(15000);

let repository: PrescriptionAndesRepository;

beforeAll(async () => {
    await connectTestDB();
    repository = new PrescriptionAndesRepository();
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

function createAndesPrescription(overrides = {}): Promise<IPrescriptionAndes> {
    return PrescriptionAndes.create({
        idAndes: 'andes-123',
        profesionalId: 'prof123',
        paciente: {
            documento: '12345678',
            nombre: 'Juan',
            apellido: 'Pérez',
            sexo: 'masculino',
        },
        concepto: { conceptId: '12345', term: 'Ibuprofeno' },
        estadoActual: { tipo: 'vigente' },
        estadoDispensaActual: { tipo: 'pendiente' },
        ...overrides,
    });
}

describe('PrescriptionAndesRepository', () => {
    describe('findById', () => {
        it('returns null for non-existent id', async () => {
            const result = await repository.findById('000000000000000000000000');
            expect(result).toBeNull();
        });

        it('finds by mongo id', async () => {
            const created = await createAndesPrescription();
            const result = await repository.findById(created._id.toString());
            expect(result).not.toBeNull();
            expect(result!.idAndes).toBe('andes-123');
        });
    });

    describe('findByIdAndes', () => {
        it('finds by idAndes', async () => {
            await createAndesPrescription();
            const result = await repository.findByIdAndes('andes-123');
            expect(result).not.toBeNull();
            expect(result!.paciente!.documento).toBe('12345678');
        });

        it('returns null for unknown idAndes', async () => {
            const result = await repository.findByIdAndes('no-existe');
            expect(result).toBeNull();
        });
    });

    describe('findByProfessionalId', () => {
        it('returns prescriptions for a professional', async () => {
            await createAndesPrescription();
            await createAndesPrescription({ idAndes: 'andes-456', profesionalId: 'prof456' });

            const result = await repository.findByProfessionalId('prof123');
            expect(result.prescriptions).toHaveLength(1);
            expect(result.total).toBe(1);
        });

        it('returns empty for unknown professional', async () => {
            const result = await repository.findByProfessionalId('no-existe');
            expect(result.prescriptions).toEqual([]);
            expect(result.total).toBe(0);
        });
    });

    describe('findByDocumentAndConcept', () => {
        it('finds by document and concept', async () => {
            await createAndesPrescription();

            const result = await repository.findByDocumentAndConcept('12345678', '12345');
            expect(result).toHaveLength(1);
        });

        it('excludes already dispensed', async () => {
            await createAndesPrescription({ estadoDispensaActual: { tipo: 'dispensada' } });

            const result = await repository.findByDocumentAndConcept('12345678', '12345');
            expect(result).toHaveLength(0);
        });
    });

    describe('findByDocumento', () => {
        it('finds by document', async () => {
            await createAndesPrescription();
            const result = await repository.findByDocumento('12345678');
            expect(result).toHaveLength(1);
        });
    });

    describe('create', () => {
        it('creates a new prescription andes record', async () => {
            const result = await repository.create({
                idAndes: 'andes-new',
                profesionalId: 'prof123',
                paciente: { documento: '99999999', nombre: 'Ana', apellido: 'López', sexo: 'femenino' },
                estadoActual: { tipo: 'vigente' },
                estadoDispensaActual: { tipo: 'pendiente' },
            } as Partial<IPrescriptionAndes>);

            expect(result.idAndes).toBe('andes-new');
            expect(result.paciente!.documento).toBe('99999999');
        });
    });

    describe('delete', () => {
        it('deletes by mongo id', async () => {
            const created = await createAndesPrescription();
            await repository.delete(created._id.toString());
            const result = await repository.findById(created._id.toString());
            expect(result).toBeNull();
        });
    });

    describe('deleteByIdAndes', () => {
        it('deletes by idAndes', async () => {
            await createAndesPrescription();
            await repository.deleteByIdAndes('andes-123');
            const result = await repository.findByIdAndes('andes-123');
            expect(result).toBeNull();
        });
    });

    describe('countByProfessionalId', () => {
        it('counts by professional id', async () => {
            await createAndesPrescription();
            await createAndesPrescription({ idAndes: 'andes-456' });

            const count = await repository.countByProfessionalId('prof123');
            expect(count).toBe(2);
        });
    });
});
