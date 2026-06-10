import { connectTestDB, clearCollections, disconnectTestDB } from '../../helpers/db';
import { CertificateRepository } from '../../../src/modules/certificates/certificates.repository';
import { CertificateService } from '../../../src/modules/certificates/certificates.service';
import { CertificateNotFoundError } from '../../../src/modules/certificates/certificates.errors';

jest.setTimeout(15000);

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

let repository: CertificateRepository;
let service: CertificateService;

beforeAll(async () => {
    await connectTestDB();
    repository = new CertificateRepository();
    service = new CertificateService(repository, logger as any);
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
});

describe('CertificateService', () => {
    const certificateData = {
        patient: {
            firstName: 'Juan',
            lastName: 'Perez',
            dni: '12345678',
            sex: 'Masculino',
        },
        professional: {
            userId: '000000000000000000000001',
            businessName: 'Dr. Gomez',
        },
        startDate: '2025-01-15',
        cantDias: 10,
    };

    describe('index', () => {
        it('returns empty list when no certificates', async () => {
            const result = await service.index(0, 20);
            expect(result.certificates).toEqual([]);
            expect(result.total).toBe(0);
        });

        it('returns paginated certificates', async () => {
            await service.create(certificateData);
            const result = await service.index(0, 20);
            expect(result.certificates).toHaveLength(1);
            expect(result.total).toBe(1);
        });
    });

    describe('show', () => {
        it('returns certificate by id', async () => {
            const created = await service.create(certificateData);
            const result = await service.show(created._id.toString());
            expect(result.patient.firstName).toBe('Juan');
        });

        it('throws CertificateNotFoundError for non-existent id', async () => {
            await expect(service.show('000000000000000000000000')).rejects.toThrow(CertificateNotFoundError);
        });
    });

    describe('getByUserId', () => {
        it('returns certificates for user', async () => {
            await service.create(certificateData);
            const result = await service.getByUserId('000000000000000000000001', 0, 20);
            expect(result.certificates).toHaveLength(1);
            expect(result.total).toBe(1);
        });

        it('returns empty array when no certificates for user', async () => {
            const result = await service.getByUserId('000000000000000000000002', 0, 20);
            expect(result.certificates).toEqual([]);
            expect(result.total).toBe(0);
        });
    });

    describe('searchByUserId', () => {
        it('returns certificates matching search term', async () => {
            await service.create(certificateData);
            const result = await service.searchByUserId('000000000000000000000001', 'Juan', 0, 20);
            expect(result.certificates).toHaveLength(1);
        });

        it('returns empty when no match', async () => {
            await service.create(certificateData);
            const result = await service.searchByUserId('000000000000000000000001', 'zzzzz', 0, 20);
            expect(result.certificates).toEqual([]);
        });
    });

    describe('create', () => {
        it('creates a certificate', async () => {
            const result = await service.create(certificateData);
            expect(result.patient.firstName).toBe('Juan');
            expect(result.cantDias).toBe(10);
        });
    });

    describe('update', () => {
        it('anulates certificate', async () => {
            const created = await service.create(certificateData);
            const updated = await service.update(created._id.toString(), { anulateReason: 'Error médico' });
            expect(updated.status).toBe('anulado');
            expect(updated.anulateReason).toBe('Error médico');
        });

        it('throws CertificateNotFoundError for non-existent id', async () => {
            await expect(service.update('000000000000000000000000', { anulateReason: 'X' })).rejects.toThrow(CertificateNotFoundError);
        });
    });

    describe('delete', () => {
        it('deletes existing certificate', async () => {
            const created = await service.create(certificateData);
            await service.delete(created._id.toString());
            await expect(service.show(created._id.toString())).rejects.toThrow(CertificateNotFoundError);
        });

        it('throws CertificateNotFoundError for non-existent id', async () => {
            await expect(service.delete('000000000000000000000000')).rejects.toThrow(CertificateNotFoundError);
        });
    });
});
