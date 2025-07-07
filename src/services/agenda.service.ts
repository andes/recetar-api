import Agenda, { Job } from 'agenda';
import { env } from '../config/config';

class AgendaService {
    private static instance: AgendaService;
    private agenda: Agenda;
    private isInitialized: boolean = false;

    private constructor() {
        this.agenda = new Agenda();
        this.initialize();
    }

    public static getInstance(): AgendaService {
        if (!AgendaService.instance) {
            AgendaService.instance = new AgendaService();
        }
        return AgendaService.instance;
    }

    private async initialize() {
        if (this.isInitialized) return;

        const mongoConnectionString = process.env.MONGO_URI || env.MONGODB_CONNECTION || 'mongodb://localhost/recetar';
        
        this.agenda = new Agenda({
            db: { 
                address: mongoConnectionString,
                collection: 'agendaJobs'
            },
            processEvery: '30 seconds',
            maxConcurrency: 20,
            defaultConcurrency: 5,
            defaultLockLifetime: 10000
        });

        this.defineJobs();
        await this.agenda.start();
        this.isInitialized = true;
    }

    private defineJobs() {
        // Job para envío de emails
        this.agenda.define('send email', { concurrency: 10 }, async (job: Job) => {
            const { to, subject, body, template } = job.attrs.data as { 
                to: string; 
                subject: string; 
                body: string; 
                template?: string 
            };
            
            console.log(`📧 Enviando email a: ${to}, Asunto: ${subject}`);
            
           
            
            // Tiempo de procesamiento (logica de envío de email)
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(`✅ Email enviado exitosamente a: ${to}`);
        });

    }

    // Métodos públicos para programar jobs
    public async scheduleJob(jobName: string, data: any, when?: string | Date): Promise<void> {
        await this.initialize();
        
        if (when) {
            await this.agenda.schedule(when, jobName, data);
        } else {
            await this.agenda.now(jobName, data);
        }
    }

    public async scheduleRecurringJob(interval: string, jobName: string, data?: any): Promise<void> {
        await this.initialize();
        await this.agenda.every(interval, jobName, data);
    }

    public async cancelJob(query: any): Promise<number> {
        await this.initialize();
        const result = await this.agenda.cancel(query);
        return result || 0;
    }

    public async cancelAllJobs(jobName: string): Promise<number> {
        await this.initialize();
        const result = await this.agenda.cancel({ name: jobName });
        return result || 0;
    }

    public async getJobs(query: any = {}): Promise<Job[]> {
        await this.initialize();
        return await this.agenda.jobs(query);
    }

    public async gracefulShutdown(): Promise<void> {
        if (this.isInitialized) {
            await this.agenda.stop();
        }
    }

    // Métodos específicos del dominio de la aplicación
    public async scheduleEmailJob(emailData: {
        to: string;
        subject: string;
        body: string;
        template?: string;
        when?: string | Date;
    }): Promise<void> {
        const { when, ...data } = emailData;
        await this.scheduleJob('send email', data, when);
    }



    public async setupAutomaticTasks(): Promise<void> {
        await this.initialize();
        
        
        console.log('🕒 Tareas automáticas configuradas');
    }
}

export default AgendaService;
