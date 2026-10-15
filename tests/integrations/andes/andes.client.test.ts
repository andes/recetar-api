import axios from 'axios';
import { AndesClient, decodeAndesResponse } from '../../../src/integrations/andes/andes.client';

jest.mock('axios');

describe('decodeAndesResponse', () => {
    it('decodifica respuestas UTF-8 con tildes', () => {
        const bytes = Buffer.from(JSON.stringify({ nombre: 'NICOL\u00c1S' }), 'utf8');

        const result = decodeAndesResponse<{ nombre: string }>(bytes);

        expect(result.nombre).toBe('NICOL\u00c1S');
    });

    it('decodifica respuestas Windows-1252/Latin-1 con tildes', () => {
        const bytes = Buffer.from(JSON.stringify({ nombre: 'NICOL\u00c1S' }), 'latin1');

        const result = decodeAndesResponse<{ nombre: string }>(bytes);

        expect(result.nombre).toBe('NICOL\u00c1S');
        expect(result.nombre).not.toContain('\uFFFD');
    });

    it('normaliza acentos descompuestos a NFC', () => {
        const bytes = Buffer.from(JSON.stringify({ nombre: 'Nicola\u0301s' }), 'utf8');

        const result = decodeAndesResponse<{ nombre: string }>(bytes);

        expect(result.nombre).toBe('Nicol\u00e1s');
    });
});

describe('AndesClient.searchPatients', () => {
    const request = jest.fn();

    beforeEach(() => {
        request.mockReset();
        request.mockResolvedValue({ data: Buffer.from('[]', 'utf8') });
        (axios.create as jest.Mock).mockReturnValue({ request });
    });

    function createClient(): AndesClient {
        return new AndesClient({
            andesEndpoint: 'http://andes.test',
            jwtMpiToken: 'token',
            mpiEndpoint: '/mpi',
        });
    }

    it('configura un timeout para las requests', () => {
        createClient();

        expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({ timeout: 20000 }));
    });

    it('envía un limit por defecto cuando no se especifica', async () => {
        await createClient().searchPatients({});

        expect(request).toHaveBeenCalledWith(expect.objectContaining({
            params: expect.objectContaining({ activo: true, limit: 50 }),
        }));
    });

    it('respeta el limit explícito', async () => {
        await createClient().searchPatients({ limit: 21 });

        expect(request).toHaveBeenCalledWith(expect.objectContaining({
            params: expect.objectContaining({ limit: 21 }),
        }));
    });
});
