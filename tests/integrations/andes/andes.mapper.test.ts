import { AndesMapper, AndesProfesionalDetalle, AndesFarmacia, LocalProfessional } from '../../../src/integrations/andes';

const futureDate = '2099-01-01T00:00:00.000Z';
const pastDate = '2000-01-01T00:00:00.000Z';

function buildProfessional(overrides: Partial<AndesProfesionalDetalle> = {}): AndesProfesionalDetalle {
    return {
        id: 'prof1',
        documento: '30123456',
        nombre: 'Ana',
        apellido: 'Pérez',
        cuit: '27-30123456-3',
        profesiones: [
            {
                profesion: { codigo: 1, nombre: 'Médico' },
                matriculado: true,
                matriculacion: [
                    { matriculaNumero: 111, inicio: '2010-01-01', fin: '2020-01-01' },
                    { matriculaNumero: 222, inicio: '2020-01-01', fin: futureDate },
                ],
            },
        ],
        ...overrides,
    };
}

describe('AndesMapper', () => {
    describe('estadoMatricula', () => {
        it('returns sin-matricula when there is no matriculacion', () => {
            const estado = AndesMapper.estadoMatricula({ profesion: { codigo: 1, nombre: 'Médico' } });
            expect(estado).toBe('sin-matricula');
        });

        it('returns suspendida when matriculado is false', () => {
            const estado = AndesMapper.estadoMatricula({
                matriculado: false,
                matriculacion: [{ matriculaNumero: 1, fin: futureDate }],
            });
            expect(estado).toBe('suspendida');
        });

        it('returns baja when the last matricula has baja.fecha', () => {
            const estado = AndesMapper.estadoMatricula({
                matriculado: true,
                matriculacion: [{ matriculaNumero: 1, fin: futureDate, baja: { fecha: '2021-05-01' } }],
            });
            expect(estado).toBe('baja');
        });

        it('returns vencida when the last matricula fin is in the past', () => {
            const estado = AndesMapper.estadoMatricula({
                matriculado: true,
                matriculacion: [{ matriculaNumero: 1, fin: pastDate }],
            });
            expect(estado).toBe('vencida');
        });

        it('returns vigente when the last matricula fin is in the future', () => {
            const estado = AndesMapper.estadoMatricula({
                matriculado: true,
                matriculacion: [{ matriculaNumero: 1, fin: futureDate }],
            });
            expect(estado).toBe('vigente');
        });
    });

    describe('toProfesionGrado', () => {
        it('maps grado formaciones using the last matricula', () => {
            const result = AndesMapper.toProfesionGrado(buildProfessional());
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                profesion: 'Médico',
                codigoProfesion: '1',
                numeroMatricula: '222',
                estado: 'vigente',
            });
            expect(result[0].vencimiento).toEqual(new Date(futureDate));
        });

        it('returns empty array when there are no profesiones', () => {
            expect(AndesMapper.toProfesionGrado(buildProfessional({ profesiones: [] }))).toEqual([]);
        });
    });

    describe('toSyncableProfessional', () => {
        it('maps cuil, name parts, businessName (uppercase) and idAndes', () => {
            const result = AndesMapper.toSyncableProfessional(buildProfessional());
            expect(result.cuil).toBe('27-30123456-3');
            expect(result.firstName).toBe('Ana');
            expect(result.lastName).toBe('Pérez');
            expect(result.businessName).toBe('PÉREZ ANA');
            expect(result.idAndes).toBe('prof1');
            expect(result.profesionGrado).toHaveLength(1);
        });
    });

    describe('toSyncablePharmacist', () => {
        const farmacia: AndesFarmacia = {
            _id: 'farm1',
            cuit: '20123456789',
            denominacion: 'Farmacia Centro',
            razonSocial: 'Farmacia Centro S.A.',
            matriculaDTResponsable: 'DT-999',
        };

        it('uses razonSocial as businessName when present', () => {
            const result = AndesMapper.toSyncablePharmacist(farmacia);
            expect(result.businessName).toBe('Farmacia Centro S.A.');
            expect(result.razonSocial).toBe('Farmacia Centro S.A.');
            expect(result.cuil).toBe('20123456789');
            expect(result.responsibleDTEnrollment).toBe('DT-999');
            expect(result.idAndes).toBe('farm1');
        });

        it('falls back to denominacion when razonSocial is empty', () => {
            const result = AndesMapper.toSyncablePharmacist({ ...farmacia, razonSocial: '' });
            expect(result.businessName).toBe('Farmacia Centro');
        });
    });

    describe('toMatriculasEstado', () => {
        it('returns estadoGeneral vigente and grado matriculas', () => {
            const result = AndesMapper.toMatriculasEstado(buildProfessional());
            expect(result.documento).toBe('30123456');
            expect(result.profesionalMatriculado).toBe(true);
            expect(result.estadoGeneral).toBe('vigente');
            expect(result.matriculas).toHaveLength(1);
            expect(result.matriculas[0]).toMatchObject({ profesion: 'Médico', numero: 222, estado: 'vigente' });
        });

        it('returns vencida as estadoGeneral when the matricula is expired', () => {
            const result = AndesMapper.toMatriculasEstado(buildProfessional({
                profesiones: [{
                    profesion: { codigo: 1, nombre: 'Médico' },
                    matriculado: true,
                    matriculacion: [{ matriculaNumero: 1, fin: pastDate }],
                }],
            }));
            expect(result.estadoGeneral).toBe('vencida');
        });

        it('returns sin-matricula when there are no profesiones', () => {
            const result = AndesMapper.toMatriculasEstado(buildProfessional({ profesiones: [] }));
            expect(result.matriculas).toEqual([]);
            expect(result.estadoGeneral).toBe('sin-matricula');
        });
    });

    describe('resolveNameParts', () => {
        it('prefers firstName/lastName when present', () => {
            const professional = { username: 'x', businessName: 'IGNORED', firstName: 'Ana', lastName: 'Pérez' } as LocalProfessional;
            expect(AndesMapper.resolveNameParts(professional)).toEqual({ nombre: 'Ana', apellido: 'Pérez' });
        });

        it('falls back to businessName split by comma (legacy)', () => {
            const professional = { username: 'x', businessName: 'Pérez, Ana' } as LocalProfessional;
            expect(AndesMapper.resolveNameParts(professional)).toEqual({ nombre: 'Ana', apellido: 'Pérez' });
        });
    });
});
