const VALID_PATIENT_SEX_VALUES = ['masculino', 'femenino', 'otro'] as const;
type PatientSex = typeof VALID_PATIENT_SEX_VALUES[number];

export const normalizePatientSex = (value: unknown): PatientSex | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    return VALID_PATIENT_SEX_VALUES.includes(normalized as PatientSex)
        ? normalized as PatientSex
        : undefined;
};

export const buildPatientSexRegex = (value: unknown): RegExp | undefined => {
    const normalized = normalizePatientSex(value);
    return normalized ? new RegExp(`^${normalized}$`, 'i') : undefined;
};

export const matchesPatientSex = (candidate: unknown, expected: unknown): boolean => {
    const normalizedExpected = normalizePatientSex(expected);

    if (!normalizedExpected) {
        return true;
    }

    return typeof candidate === 'string' && candidate.trim().toLowerCase() === normalizedExpected;
};
