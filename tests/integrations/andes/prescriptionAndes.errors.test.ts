import { PrescriptionAndesNotFoundError } from '../../../src/integrations/andes';

describe('PrescriptionAndesNotFoundError', () => {
    it('creates with correct code and status', () => {
        const error = new PrescriptionAndesNotFoundError();
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('RECURSO_NOT_FOUND');
        expect(error.message).toBe('Receta de ANDES no encontrada');
    });
});
