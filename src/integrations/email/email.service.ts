import { MailOptions, EmailSender } from './email.types';
import { Logger } from '../../shared/logger/logger.interface';

export class EmailService {
    constructor(
        private readonly sender: EmailSender,
        private readonly logger: Logger,
    ) {}

    async send(options: MailOptions): Promise<void> {
        await this.sender.send(options);
        this.logger.logInfo('Email sent', { to: options.to, subject: options.subject });
    }

    async sendWithTemplate(
        templateService: { render: (name: string, data: Record<string, unknown>) => Promise<string> },
        templateName: string,
        data: Record<string, unknown>,
        options: Omit<MailOptions, 'html'>,
    ): Promise<void> {
        const html = await templateService.render(templateName, data);
        await this.send({ ...options, html });
    }
}
