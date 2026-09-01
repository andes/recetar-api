import IPrescription from '../../interfaces/prescription.interface';
import IUser from '../../interfaces/user.interface';
import IPatient from '../../interfaces/patient.interface';
import {
    EvwebRecetaRequest,
    EvwebMedicamentoReceta,
    EvwebPrescripcionRequest,
    EvwebMedicoPrescripcion,
    EvwebPacientePrescripcion,
    EvwebEstudio,
    EvwebDiagnosticoPrescripcion,
} from './evweb.types';

export class EvwebMapper {

    // ─── Local → evWeb ─────────────────────────────────────────────────────

    static toEvwebReceta(
        prescription: IPrescription,
        professional: IUser,
        patient: IPatient,
        provincia: string
    ): EvwebRecetaRequest {
        const supply = prescription.supplies[0];
        const medicamentos: EvwebMedicamentoReceta[] = prescription.supplies.map((s) => {
            const med: EvwebMedicamentoReceta = {
                Cantidad: s.quantityPresentation || s.quantity || 1,
                EsSugerido: false,
            };

            // Si el supply tiene un code con source "alphabeta" o "evweb", usarlo como CodAlfabeta
            const alphaCode = EvwebMapper.extractAlphaBetaCode(s.supply as any);
            if (alphaCode) {
                med.CodAlfabeta = alphaCode;
            } else {
                // Sin código AlphaBeta, enviar datos descriptivos
                med.Nombre = s.supply.name || '';
                med.Monodroga = s.supply.activePrinciple || '';
                med.Presentacion = s.supply.firstPresentation || '';
                med.Laboratorio = '';
            }

            return med;
        });

        const cuitNumerico = EvwebMapper.parseCuit(professional.cuil || '');
        const dniNumerico = patient.dni ? parseInt(patient.dni, 10) : 0;

        return {
            MD_CUIT: cuitNumerico,
            PC_DNI: dniNumerico,
            PC_CUIL: professional.cuil || undefined,
            PC_NroAfiliado: patient.obraSocial?.numeroAfiliado || undefined,
            PC_OS_Prepaga: patient.obraSocial?.nombre || undefined,
            MD_Matricula: professional.enrollment || '',
            MD_Sello_Matricula: professional.enrollment?.replace(/\D/g, '') || undefined,
            FechaReceta: prescription.date.toISOString().split('T')[0],
            MD_Nombre: professional.businessName || '',
            MD_Profesion: 'Médico',
            MD_Especialidad: 'MEDICINA GENERAL Y/O FAMILIAR',
            MD_Domicilio: undefined,
            MD_UrlFirma: undefined,
            PC_Nombre: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
            PC_FechaNacimiento: patient.fechaNac ? patient.fechaNac.toISOString() : '',
            PC_Sexo: EvwebMapper.mapSexo(patient.sex),
            PC_TipoDocumento: 0,
            PC_Telefono: undefined,
            PC_Email: undefined,
            Indicaciones: supply.indication || '',
            Medicamentos: medicamentos,
            Diagnostico: supply.diagnostic || 'Sin diagnóstico',
            DiagnosticoCodigo: undefined,
            MD_Sello_Nombre: professional.businessName || undefined,
            MD_Sello_Especialidad: 'MEDICINA GENERAL Y/O FAMILIAR',
            ProvinciaAsociacion: provincia,
            Tratamiento_Prolongado: prescription.trimestral || false,
            Solicitante: 'EVWEB',
            EsLey27675: false,
        };
    }

    static toEvwebPrescripcion(
        prescription: IPrescription,
        professional: IUser,
        patient: IPatient
    ): EvwebPrescripcionRequest {
        const supply = prescription.supplies[0];

        const medico: EvwebMedicoPrescripcion = {
            Nombre: professional.businessName || '',
            CUIT: EvwebMapper.parseCuit(professional.cuil || ''),
            Matricula: professional.enrollment || '',
            Profesion: 'Médico',
            Especialidad: 'MEDICINA GENERAL Y/O FAMILIAR',
        };

        const paciente: EvwebPacientePrescripcion = {
            Nombre: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
            DNI: patient.dni ? parseInt(patient.dni, 10) : 0,
            Sexo: EvwebMapper.mapSexo(patient.sex),
            FechaNacimiento: patient.fechaNac ? patient.fechaNac.toISOString() : '',
            ObraSocial_Prepaga: patient.obraSocial?.nombre || undefined,
            NumeroAfiliado: patient.obraSocial?.numeroAfiliado || undefined,
        };

        const estudios: EvwebEstudio[] = [{
            Codigo: supply.supply.snomedConcept?.conceptId || '',
            Descripcion: supply.supply.snomedConcept?.term || supply.supply.name || '',
        }];

        const diagnostico: EvwebDiagnosticoPrescripcion = {
            ListaCodigosId: [],
            Descripcion: supply.diagnostic || 'Sin diagnóstico',
        };

        return {
            FechaReceta: prescription.date.toISOString(),
            Medico: medico,
            Paciente: paciente,
            ListaEstudios: estudios,
            Diagnostico: diagnostico,
        };
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    private static mapSexo(sexo: string): string {
        if (!sexo) { return 'M'; }
        const lower = sexo.toLowerCase().trim();
        if (lower === 'femenino' || lower === 'f') { return 'F'; }
        if (lower === 'masculino' || lower === 'm') { return 'M'; }
        return 'X';
    }

    private static parseCuit(cuil: string): number {
        if (!cuil) { return 0; }
        const digits = cuil.replace(/\D/g, '');
        return parseInt(digits, 10) || 0;
    }

    private static extractAlphaBetaCode(supply: any): number | null {
        if (!supply.code) { return null; }

        // code puede ser un objeto o un array
        const codes = Array.isArray(supply.code) ? supply.code : [supply.code];

        for (const c of codes) {
            if (c.source === 'alphabeta' || c.source === 'evweb' || c.fuente === 'alphabeta' || c.fuente === 'evweb') {
                const val = c.value || c.valor || c.id;
                if (val) {
                    const num = parseInt(String(val), 10);
                    if (!isNaN(num)) { return num; }
                }
            }
        }

        // Si hay un code con id numérico, intentar usarlo como alphabeta
        for (const c of codes) {
            if (c.id) {
                const num = parseInt(String(c.id), 10);
                if (!isNaN(num) && num > 0) { return num; }
            }
        }

        return null;
    }
}
