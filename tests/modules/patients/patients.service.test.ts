import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { PatientRepository } from '../../../src/modules/patients/patients.repository';
import { PatientService } from '../../../src/modules/patients/patients.service';
import { PatientNotFoundError } from '../../../src/modules/patients/patients.errors';
import { AndesClient, AndesMPIPatient, AndesCoverage } from '../../../src/integrations/andes';

jest.setTimeout(15000);

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

class AndesClientStub {
    async searchPatientInMPI(_dni: string, _sexo: string): Promise<AndesMPIPatient[]> {
        return [];
    }
    async createPatientInMPI(_data: Record<string, unknown>, _ignoreSuggestions?: boolean): Promise<AndesMPIPatient> {
        return {} as AndesMPIPatient;
    }
    async getPatientFromMPI(_id: string): Promise<AndesMPIPatient> {
        return {} as AndesMPIPatient;
    }
    async updatePatientInMPI(_id: string, _data: Record<string, unknown>): Promise<void> {
    }
    async listCoverages(): Promise<AndesCoverage[]> {
        return [{ nombre: 'OSDE', codigoPuco: 12345 }] as AndesCoverage[];
    }
    async getPatientCoverage(_dni: string, _sexo: string): Promise<AndesCoverage> {
        return { nombre: 'OSDE', codigoPuco: 12345 } as AndesCoverage;
    }
}

let repository: PatientRepository;
let service: PatientService;

beforeAll(async () => {
    await connectTestDB();
    repository = new PatientRepository();
    service = new PatientService(repository, new AndesClientStub() as unknown as AndesClient, logger as any);
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

describe('PatientService', () => {
    const patientData = {
        dni: '12345678',
        firstName: 'Juan',
        lastName: 'Pérez',
        sex: 'Masculino' as const,
    };

    describe('list', () => {
        it('returns empty list when no patients', async () => {
            const result = await service.list();
            expect(result).toEqual([]);
        });

        it('returns all patients', async () => {
            await service.create(patientData);
            await service.create({ ...patientData, dni: '87654321', firstName: 'María' });

            const result = await service.list();
            expect(result).toHaveLength(2);
        });
    });

    describe('show', () => {
        it('returns patient by id', async () => {
            const created = await service.create(patientData);

            const result = await service.show(created._id.toString());
            expect(result.dni).toBe('12345678');
        });

        it('throws PatientNotFoundError for non-existent id', async () => {
            await expect(service.show('000000000000000000000000')).rejects.toThrow(PatientNotFoundError);
        });
    });

    describe('create', () => {
        it('creates a patient with all fields', async () => {
            const dto = {
                ...patientData,
                fechaNac: '1990-01-15',
                nombreAutopercibido: 'Juancito',
                genero: 'masculino',
                cuil: '20-12345678-9',
            };

            const result = await service.create(dto);
            expect(result.dni).toBe('12345678');
            expect(result.firstName).toBe('Juan');
            expect(result.lastName).toBe('Pérez');
            expect(result.sex).toBe('Masculino');
            expect(result.nombreAutopercibido).toBe('Juancito');
            expect(result.genero).toBe('masculino');
            expect(result.cuil).toBe('20-12345678-9');
            expect(result.fechaNac).toBeInstanceOf(Date);
        });
    });

    describe('update', () => {
        it('updates patient fields', async () => {
            const created = await service.create(patientData);

            const updated = await service.update(created._id.toString(), { firstName: 'Carlos' });
            expect(updated.firstName).toBe('Carlos');
            expect(updated.dni).toBe('12345678');
        });

        it('throws PatientNotFoundError for non-existent id', async () => {
            await expect(service.update('000000000000000000000000', { firstName: 'X' })).rejects.toThrow(PatientNotFoundError);
        });
    });

    describe('updatePartial', () => {
        it('updates allowed fields', async () => {
            const created = await service.create(patientData);

            const updated = await service.updatePartial(created._id.toString(), { firstName: 'Pedro', sex: 'Femenino' });
            expect(updated.firstName).toBe('Pedro');
            expect(updated.sex).toBe('Femenino');
        });

        it('ignores non-allowed fields', async () => {
            const created = await service.create(patientData);

            const updated = await service.updatePartial(created._id.toString(), {
                firstName: 'Pedro',
                cuil: 'should-be-ignored',
            });
            expect(updated.firstName).toBe('Pedro');
        });

        it('throws PatientNotFoundError for non-existent id', async () => {
            await expect(service.updatePartial('000000000000000000000000', { firstName: 'X' })).rejects.toThrow(PatientNotFoundError);
        });
    });

    describe('findByDni', () => {
        it('returns local patient when found', async () => {
            await service.create(patientData);

            const result = await service.findByDni('12345678');
            expect(result).toHaveLength(1);
            expect(result[0].dni).toBe('12345678');
        });

        it('falls back to MPI stub (empty) when not found locally', async () => {
            const result = await service.findByDni('99999999');
            expect(result).toEqual([]);
        });
    });

    describe('getCoverages', () => {
        it('delegates to AndesClient stub', async () => {
            const result = await service.getCoverages() as AndesCoverage[];
            expect(Array.isArray(result)).toBe(true);
            expect(result[0].nombre).toBe('OSDE');
        });
    });

    describe('getCoverage', () => {
        it('delegates to AndesClient stub', async () => {
            const result = await service.getCoverage('12345678', 'femenino') as AndesCoverage;
            expect(result.nombre).toBe('OSDE');
        });
    });
});
