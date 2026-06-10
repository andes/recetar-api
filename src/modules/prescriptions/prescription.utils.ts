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
