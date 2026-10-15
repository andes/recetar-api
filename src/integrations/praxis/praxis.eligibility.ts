import { PraxisPrescriptionRequest } from './praxis.types';

export interface PraxisEligibilityResult {
    eligible: boolean;
    reason?: string;
}

// Requisitos mínimos para que Praxis acepte una prescripción.
// Si no se cumplen, la receta queda local y NO se envía (no se reintenta).
export function checkPraxisEligibility(payload: PraxisPrescriptionRequest): PraxisEligibilityResult {
    const paciente = payload?.paciente;
    if (!paciente || !paciente.numeroDocumento || paciente.numeroDocumento <= 0) {
        return { eligible: false, reason: 'Paciente sin DNI' };
    }
    if (!paciente.fechaNacimiento) {
        return { eligible: false, reason: 'Paciente sin fecha de nacimiento' };
    }
    if (!['M', 'F', 'X'].includes(paciente.sexo)) {
        return { eligible: false, reason: 'Sexo del paciente inválido para Praxis' };
    }
    if (!payload.prescriptor?.matricula) {
        return { eligible: false, reason: 'Profesional sin matrícula' };
    }
    if (!payload.prescriptor?.cuit) {
        return { eligible: false, reason: 'Profesional sin CUIT/CUIL' };
    }
    if (!['M', 'O'].includes(payload.prescriptor.tipoPrescriptor)) {
        return { eligible: false, reason: 'Profesión no soportada por Praxis' };
    }
    if (!payload.renglones?.length) {
        return { eligible: false, reason: 'Receta sin renglones' };
    }
    if (!payload.renglones.some((renglon) => (renglon.producto?.codigoAlfabeta ?? 0) > 0)) {
        return { eligible: false, reason: 'Producto sin código Alfabeta' };
    }
    return { eligible: true };
}
