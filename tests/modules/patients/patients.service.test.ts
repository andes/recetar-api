import { connectTestDB, disconnectTestDB } from '../../helpers/db';
import { PatientService } from '../../../src/modules/patients/patients.service';
import {
    PatientNotFoundError,
    PatientValidationNotFoundError,
    PatientAndesUnavailableError,
} from '../../../src/modules/patients/patients.errors';
import { AndesClient, AndesMPIPatient } from '../../../src/integrations/andes';

jest.setTimeout(15000);

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const mpiPatient = (overrides: Partial<AndesMPIPatient> = {}): AndesMPIPatient => ({
    id: 'andes-1',
    _id: 'andes-1',
    documento: '12345678',
    nombre: 'Juan',
    apellido: 'Pérez',
    sexo: 'masculino',
    estado: 'validado',
    fechaNacimiento: '1990-01-15',
    cuil: '20-12345678-9',
    ...overrides,
});

class AndesClientStub {
    public searchCalls: unknown[] = [];
    public createdPayloads: Record<string, unknown>[] = [];
    public searchResult: AndesMPIPatient[] = [mpiPatient()];
    public searchImpl?: (params: unknown) => Promise<AndesMPIPatient[]>;
    public validateResult: unknown = { documento: '12345678', nombre: 'Juan', apellido: 'Pérez', sexo: 'masculino' };
    public validateImpl?: () => Promise<unknown>;
    public createdPatient = mpiPatient();

    async searchPatients(params: unknown): Promise<AndesMPIPatient[]> {
        this.searchCalls.push(params);
        if (this.searchImpl) { return this.searchImpl(params); }
        return this.searchResult;
    }

    async getPatientFromMPI(id: string): Promise<AndesMPIPatient> {
        return mpiPatient({ id, _id: id });
    }

    async updatePatientInMPI(id: string, data: Record<string, unknown>): Promise<AndesMPIPatient> {
        return mpiPatient({ id, _id: id, ...data } as Partial<AndesMPIPatient>);
    }

    async validatePatient(): Promise<unknown> {
        if (this.validateImpl) { return this.validateImpl(); }
        return this.validateResult;
    }

    async createPatientInMPI(data: Record<string, unknown>): Promise<unknown> {
        this.createdPayloads.push(data);
        return this.createdPatient;
    }
}

let stub: AndesClientStub;
let service: PatientService;

beforeAll(async () => {
    await connectTestDB();
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(() => {
    stub = new AndesClientStub();
    service = new PatientService(stub as unknown as AndesClient, logger as any);
});

describe('PatientService (Andes como fuente de verdad)', () => {
    describe('findByDni', () => {
        it('consulta Andes y mapea el resultado', async () => {
            const result = await service.findByDni('12345678');
            expect(stub.searchCalls[0]).toMatchObject({ documento: '12345678' });
            expect(result).toHaveLength(1);
            expect(result[0].dni).toBe('12345678');
            expect(result[0].idMPI).toBe('andes-1');
        });

        it('devuelve [] si Andes no encuentra', async () => {
            stub.searchImpl = async () => [];
            const result = await service.findByDni('99999999');
            expect(result).toEqual([]);
        });
    });

    describe('create', () => {
        it('reutiliza el paciente existente sin crear', async () => {
            const result = await service.create({ dni: '12345678', sex: 'Masculino' });
            expect(result.idMPI).toBe('andes-1');
            expect(stub.createdPayloads).toHaveLength(0);
        });

        it('valida con RENAPER y crea en Andes cuando no existe', async () => {
            stub.searchResult = [];
            const result = await service.create({ dni: '12345678', sex: 'Masculino' });
            expect(stub.createdPayloads).toHaveLength(1);
            expect(stub.createdPayloads[0]).toMatchObject({ estado: 'validado' });
            expect(result.idMPI).toBe('andes-1');
        });

        it('lanza 422 si RENAPER no encuentra ciudadano', async () => {
            stub.searchResult = [];
            stub.validateImpl = async () => null;
            await expect(service.create({ dni: '12345678', sex: 'Masculino' }))
                .rejects.toThrow(PatientValidationNotFoundError);
        });

        it('si Andes devuelve sugeridos, reutiliza el match exacto', async () => {
            let searchCount = 0;
            stub.searchImpl = async () => {
                searchCount += 1;
                return searchCount === 1 ? [] : [mpiPatient()];
            };
            stub.createdPatient = { sugeridos: [{ documento: '12345678' }] };
            const result = await service.create({ dni: '12345678', sex: 'Masculino' });
            expect(result.idMPI).toBe('andes-1');
        });
    });

    describe('errores de disponibilidad', () => {
        it('lanza 502 cuando Andes falla', async () => {
            stub.searchImpl = async () => { throw { response: { status: 500 } }; };
            await expect(service.findByDni('12345678')).rejects.toThrow(PatientAndesUnavailableError);
        });
    });

    describe('show', () => {
        it('lanza 404 si no existe en Andes', async () => {
            stub.getPatientFromMPI = async () => { throw { response: { status: 404 } }; };
            await expect(service.show('000000000000000000000000')).rejects.toThrow(PatientNotFoundError);
        });
    });

    describe('resolveSnapshot', () => {
        it('devuelve snapshot hidratado desde Andes', async () => {
            const snapshot = await service.resolveSnapshot('12345678', 'femenino');
            expect(snapshot).toMatchObject({ dni: '12345678', firstName: 'Juan', idMPI: 'andes-1' });
            expect(snapshot?.fechaNac).toBeInstanceOf(Date);
        });

        it('devuelve null si el paciente no existe', async () => {
            stub.searchImpl = async () => [];
            const snapshot = await service.resolveSnapshot('99999999', 'femenino');
            expect(snapshot).toBeNull();
        });
    });
});
