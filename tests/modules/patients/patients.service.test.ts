import { connectTestDB, disconnectTestDB } from '../../helpers/db';
import { PatientService } from '../../../src/modules/patients/patients.service';
import {
    PatientNotFoundError,
    PatientValidationNotFoundError,
    PatientAndesUnavailableError,
    PatientAndesUnauthorizedError,
} from '../../../src/modules/patients/patients.errors';
import { AndesClient, AndesMapper, AndesMPIPatient } from '../../../src/integrations/andes';

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
    contacto: [
        { tipo: 'email', valor: 'juan@example.com', ranking: 1, activo: true },
        { tipo: 'celular', valor: '2994000000', ranking: 1, activo: true },
    ],
    direccion: [
        {
            valor: 'San Martín 123',
            codigoPostal: '8300',
            ubicacion: { localidad: { nombre: 'Neuquén' }, provincia: { nombre: 'Neuquén' }, pais: { nombre: 'Argentina' } },
            ranking: 1,
            activo: true,
            geoReferencia: [-38.95, -68.06],
        },
    ],
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
    public updateCalls: Array<{ id: string; data: Record<string, unknown> }> = [];

    async searchPatients(params: unknown): Promise<AndesMPIPatient[]> {
        this.searchCalls.push(params);
        if (this.searchImpl) { return this.searchImpl(params); }
        return this.searchResult;
    }

    async getPatientFromMPI(id: string): Promise<AndesMPIPatient> {
        return mpiPatient({ id, _id: id });
    }

    async updatePatientInMPI(id: string, data: Record<string, unknown>): Promise<AndesMPIPatient> {
        this.updateCalls.push({ id, data });
        return mpiPatient({ id, _id: id, ...data } as Partial<AndesMPIPatient>);
    }

    async validatePatient(): Promise<unknown> {
        const result = this.validateImpl ? await this.validateImpl() : this.validateResult;
        return result ? AndesMapper.toValidatedPatientFromResponse(result as never) : result;
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

        it('envía el género autopercibido a Andes al crear con DNI', async () => {
            stub.searchResult = [];
            await service.create({ dni: '12345678', sex: 'Masculino', genero: 'no binario' });

            expect(stub.createdPayloads[0]).toMatchObject({
                sexo: 'masculino',
                genero: 'no binario',
            });
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

        it('crea un paciente temporal sin DNI cuando se envía nombre y apellido', async () => {
            stub.createdPatient = mpiPatient({ documento: undefined, estado: 'temporal' });
            const result = await service.create({ firstName: 'Ana', lastName: 'Gómez', sex: 'Femenino' });
            expect(stub.createdPayloads).toHaveLength(1);
            expect(stub.createdPayloads[0]).toMatchObject({ estado: 'temporal', nombre: 'Ana', apellido: 'Gómez' });
            expect(stub.createdPayloads[0]).not.toHaveProperty('documento');
            expect(result.idMPI).toBe('andes-1');
        });
    });

    describe('errores de disponibilidad', () => {
        it('lanza 502 cuando Andes falla', async () => {
            stub.searchImpl = async () => { throw { response: { status: 500 } }; };
            await expect(service.findByDni('12345678')).rejects.toThrow(PatientAndesUnavailableError);
        });

        it('distingue un 401 de Andes como ANDES_UNAUTHORIZED', async () => {
            stub.searchImpl = async () => { throw { response: { status: 401 } }; };
            await expect(service.findByDni('12345678')).rejects.toThrow(PatientAndesUnauthorizedError);
        });
    });

    describe('show', () => {
        it('lanza 404 si no existe en Andes', async () => {
            stub.getPatientFromMPI = async () => { throw { response: { status: 404 } }; };
            await expect(service.show('000000000000000000000000')).rejects.toThrow(PatientNotFoundError);
        });
    });

    describe('searchPage', () => {
        it('devuelve items, hasMore y filtros a Andes', async () => {
            stub.searchResult = [mpiPatient({ id: 'a' }), mpiPatient({ id: 'b' }), mpiPatient({ id: 'c' })];
            const result = await service.searchPage({ q: 'Juan', estado: 'temporal', sexo: 'masculino', offset: 0, limit: 2 });
            expect(stub.searchCalls[0]).toMatchObject({ search: 'Juan', estado: 'temporal', sexo: 'masculino', skip: 0, limit: 3 });
            expect(result.items).toHaveLength(2);
            expect(result.hasMore).toBe(true);
            expect(result.offset).toBe(0);
            expect(result.limit).toBe(2);
        });
    });

    describe('contacto y dirección', () => {
        it('mapea contactos y direcciones desde Andes', async () => {
            const patient = await service.show('andes-1');
            expect(patient.contactos).toEqual(expect.arrayContaining([
                expect.objectContaining({ tipo: 'email', valor: 'juan@example.com' }),
                expect.objectContaining({ tipo: 'celular', valor: '2994000000' }),
            ]));
            expect(patient.direcciones?.[0]).toMatchObject({
                calle: 'San Martín 123',
                localidad: 'Neuquén',
                provincia: 'Neuquén',
                pais: 'Argentina',
            });
        });

        it('fusiona contactos y dirección principal al actualizar', async () => {
            const updated = await service.update('andes-1', {
                firstName: 'Juan Carlos',
                fechaNac: '1991-02-03',
                nombreAutopercibido: 'Juanca',
                contactos: [{ tipo: 'email', valor: 'nuevo@example.com' }],
                direcciones: [{ calle: 'Rivadavia 456', localidad: 'Cipolletti' }],
            });

            expect(updated).toBeTruthy();
            expect(stub.updateCalls[0].data).toMatchObject({
                nombre: 'Juan Carlos',
                fechaNacimiento: '1991-02-03',
                alias: 'Juanca',
            });
            expect(stub.updateCalls[0].data.contacto).toEqual(expect.arrayContaining([
                expect.objectContaining({ tipo: 'email', valor: 'nuevo@example.com' }),
                expect.objectContaining({ tipo: 'celular', valor: '2994000000' }),
            ]));
            const direccion = (stub.updateCalls[0].data.direccion as Array<Record<string, unknown>>)[0];
            expect(direccion.valor).toBe('Rivadavia 456');
            expect((direccion.ubicacion as any).localidad.nombre).toBe('Cipolletti');
            expect(direccion.geoReferencia).toEqual([-38.95, -68.06]);
        });
    });

    describe('género autopercibido', () => {
        it('no reemplaza el género con el sexo al actualizar', async () => {
            await service.update('andes-1', { sex: 'Masculino', genero: 'no binario' });

            expect(stub.updateCalls[0].data).toMatchObject({
                sexo: 'masculino',
                genero: 'no binario',
            });
        });

        it('no envía género si solo cambia el sexo', async () => {
            await service.update('andes-1', { sex: 'Femenino' });

            expect(stub.updateCalls[0].data.sexo).toBe('femenino');
            expect(stub.updateCalls[0].data).not.toHaveProperty('genero');
        });

        it('no envía género si se limpia', async () => {
            await service.update('andes-1', { sex: 'Masculino', genero: '' });

            expect(stub.updateCalls[0].data.sexo).toBe('masculino');
            expect(stub.updateCalls[0].data).not.toHaveProperty('genero');
        });

        it('preserva el género autopercibido al validar', async () => {
            stub.getPatientFromMPI = async (id: string) => mpiPatient({ id, _id: id, genero: 'no binario' });
            stub.validateResult = {
                documento: '12345678',
                nombre: 'Juan',
                apellido: 'Pérez',
                sexo: 'masculino',
            };

            await service.validateById('andes-1');

            expect(stub.updateCalls[0].data.sexo).toBe('masculino');
            expect(stub.updateCalls[0].data).not.toHaveProperty('genero');
        });
    });

    describe('validación de dirección', () => {
        it('reemplaza la dirección principal con la de RENAPER y conserva las adicionales', async () => {
            stub.getPatientFromMPI = async (id: string) => mpiPatient({
                id,
                _id: id,
                direccion: [
                    { valor: 'DIRECCION ANTERIOR 1', codigoPostal: '8300', ranking: 1, activo: true },
                    { valor: 'DIRECCION ADICIONAL 2', codigoPostal: '8301', ranking: 2, activo: true },
                ],
            });
            stub.validateResult = {
                documento: '12345678',
                nombre: 'MATIAS',
                apellido: 'PEREZ',
                sexo: 'masculino',
                direccion: [{
                    valor: 'RENAPER 123',
                    codigoPostal: '8300',
                    ubicacion: {
                        barrio: { nombre: 'CENTRO' },
                        localidad: { nombre: 'NEUQUEN' },
                        provincia: { nombre: 'NEUQUEN' },
                        pais: { nombre: 'ARGENTINA' },
                    },
                }],
            };

            await service.validateById('andes-1');

            const direcciones = stub.updateCalls[0].data.direccion as Array<Record<string, unknown>>;
            expect(direcciones).toHaveLength(2);
            expect(direcciones[0].valor).toBe('RENAPER 123');
            expect(direcciones[1].valor).toBe('DIRECCION ADICIONAL 2');
            expect(stub.updateCalls[0].data).not.toHaveProperty('genero');
        });

        it('usa la dirección validada como fallback al crear con DNI', async () => {
            stub.searchResult = [];
            stub.validateResult = {
                documento: '12345678',
                nombre: 'MATIAS',
                apellido: 'PEREZ',
                sexo: 'masculino',
                direccion: [{
                    valor: 'RENAPER 123',
                    codigoPostal: '8300',
                    ubicacion: {
                        localidad: { nombre: 'NEUQUEN' },
                        provincia: { nombre: 'NEUQUEN' },
                        pais: { nombre: 'ARGENTINA' },
                    },
                }],
            };

            await service.create({ dni: '12345678', sex: 'Masculino' });

            const direccion = (stub.createdPayloads[0].direccion as Array<Record<string, unknown>>)[0];
            expect(direccion.valor).toBe('RENAPER 123');
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

    describe('resolveSnapshotById', () => {
        it('resuelve el snapshot usando el id de MPI', async () => {
            const snapshot = await service.resolveSnapshotById('andes-1');
            expect(snapshot).toMatchObject({ firstName: 'Juan', idMPI: 'andes-1' });
        });

        it('devuelve null si el id no existe', async () => {
            stub.getPatientFromMPI = async () => { throw { response: { status: 404 } }; };
            const snapshot = await service.resolveSnapshotById('no-existe');
            expect(snapshot).toBeNull();
        });
    });
});
