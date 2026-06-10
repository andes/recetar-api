import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import moment from 'moment';
import { TemplateData } from './email.types';
import { Logger } from '../../shared/logger/logger.interface';

Handlebars.registerHelper('datetime', (dateTime: string | Date) => {
    return moment(dateTime).format('D MMM YYYY [a las] H:mm [hs]');
});

export class EmailTemplateService {
    constructor(
        private readonly logger: Logger,
        private readonly templatesPath: string = process.env.TEMPLATES_PATH || path.resolve(__dirname, '../../templates'),
    ) {}

    async render(templateName: string, data: TemplateData): Promise<string> {
        const url = path.join(this.templatesPath, templateName);

        return new Promise<string>((resolve, reject) => {
            fs.readFile(url, { encoding: 'utf-8' }, (err, html) => {
                if (err) {
                    this.logger.logError(err, { templateName });
                    return reject(err);
                }
                try {
                    const template = Handlebars.compile(html);
                    const templateData = {
                        ...data,
                        nombre: (data.usuario as Record<string, unknown>)?.businessName
                            || (data.usuario as Record<string, unknown>)?.username
                            || '',
                        username: (data.usuario as Record<string, unknown>)?.username || '',
                        url: (data.url as string) || '',
                    };
                    const htmlToSend = template(templateData);
                    resolve(htmlToSend);
                } catch (exp) {
                    this.logger.logError(exp as Error, { templateName });
                    reject(exp);
                }
            });
        });
    }
}
