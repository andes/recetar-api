export interface MailOptions {
    from: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
        filename: string;
        content?: string | Buffer;
        path?: string;
        contentType?: string;
    }>;
}

export interface TemplateData {
    [key: string]: unknown;
}

export interface EmailSender {
    send(options: MailOptions): Promise<void>;
}
