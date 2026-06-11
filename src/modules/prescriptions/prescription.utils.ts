const STATUS_MAP: Record<string, string | undefined> = {
    vigente: 'Pendiente',
    pendiente: 'Pendiente',
    dispensada: 'Dispensada',
    vencida: 'Vencida',
    finalizada: 'Dispensada',
    rechazada: undefined,
    suspendida: undefined,
    todas: undefined,
};

export function mapPrescriptionStatus(status?: string): string | undefined {
    if (!status) {return undefined;}
    return STATUS_MAP[status.toLowerCase()];
}

export function normalizeCuil(value?: string): string {
    return (value || '').replace(/\D/g, '');
}

export function cuilDigitsRegex(value: string): RegExp {
    const digits = normalizeCuil(value);
    return new RegExp(`^\\D*${digits.split('').join('\\D*')}\\D*$`);
}

export function generatePrescriptionId(date = new Date()): string {
    const pad = (num: number, size: number) => num.toString().padStart(size, '0');
    return String(
        date.getFullYear().toString() +
        pad(date.getMonth() + 1, 2) +
        pad(date.getDate(), 2) +
        pad(date.getHours(), 2) +
        pad(date.getMinutes(), 2) +
        pad(date.getSeconds(), 2) +
        pad(date.getMilliseconds(), 3) +
        pad(Math.floor(Math.random() * 999), 3),
    );
}

export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
