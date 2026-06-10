export abstract class ApiError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly messageKey?: string;
    public readonly details?: unknown[];

    constructor(
        statusCode: number,
        code: string,
        messageKey?: string,
        details?: unknown[],
    ) {
        super(messageKey || code);
        this.statusCode = statusCode;
        this.code = code;
        this.messageKey = messageKey;
        this.details = details;
    }
}
