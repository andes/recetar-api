interface SuccessResponse<T> {
    status: 'success';
    data: T;
}

interface ErrorResponse {
    status: 'error';
    error: {
        code: string;
        message: string;
        details?: unknown[];
    };
}

export const ApiResponse = {
    success<T>(data: T): SuccessResponse<T> {
        return { status: 'success', data };
    },

    error(code: string, message: string, details?: unknown[]): ErrorResponse {
        return {
            status: 'error',
            error: { code, message, ...(details ? { details } : {}) },
        };
    },
};
