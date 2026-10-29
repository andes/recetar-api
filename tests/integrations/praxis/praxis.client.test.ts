import axios from 'axios';
import { PraxisClient, PraxisAuthenticationError, PraxisPrescriptionError } from '../../../src/integrations/praxis';

function createClient(post: jest.Mock): PraxisClient {
    jest.spyOn(axios, 'create').mockReturnValue({ post } as unknown as ReturnType<typeof axios.create>);
    return new PraxisClient({ praxisEndpoint: 'http://praxis.test', praxisApiKey: 'key' });
}

const payload = { paciente: {}, prescriptor: {}, renglones: [], tratamientoProlongado: false } as any;

describe('PraxisClient.createPrescription', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('devuelve la respuesta real con hash y recetas emitidas', async () => {
        const post = jest.fn(async () => ({
            data: {
                idPrescripcion: 1,
                hash: 'HASH-1',
                recetasEmitidas: [{ idReceta: 10, hash: 'REC-1', numeroReceta: '100' }],
                mensajes: [{ severidad: 'A', mensaje: 'Aviso' }],
            },
        }));
        const client = createClient(post);

        const result = await client.createPrescription(payload);

        expect(result.idPrescripcion).toBe(1);
        expect(result.hash).toBe('HASH-1');
        expect(result.recetasEmitidas?.[0].hash).toBe('REC-1');
    });

    it('falla cuando Praxis devuelve un mensaje de severidad E', async () => {
        const post = jest.fn(async () => ({
            data: {
                idPrescripcion: 1,
                mensajes: [{ severidad: 'E', mensaje: 'Producto inválido' }],
            },
        }));
        const client = createClient(post);

        await expect(client.createPrescription(payload)).rejects.toThrow(PraxisPrescriptionError);
        await expect(client.createPrescription(payload)).rejects.toThrow('Producto inválido');
    });

    it('parsea el 400 de Praxis con mensajes[]', async () => {
        const post = jest.fn(async () => {
            throw {
                isAxiosError: true,
                message: 'Request failed',
                response: {
                    status: 400,
                    data: { mensajes: [{ severidad: 'E', mensaje: 'Matrícula inválida' }] },
                },
            };
        });
        const client = createClient(post);

        await expect(client.createPrescription(payload)).rejects.toThrow('Matrícula inválida');
    });

    it('distingue un error de autenticación', async () => {
        const post = jest.fn(async () => {
            throw {
                isAxiosError: true,
                message: 'Unauthorized',
                response: { status: 401, data: { mensaje: 'API key inválida' } },
            };
        });
        const client = createClient(post);

        await expect(client.createPrescription(payload)).rejects.toBeInstanceOf(PraxisAuthenticationError);
    });
});
