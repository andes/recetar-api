import Agenda, { Job } from 'agenda';
import { env } from '../config/config';
import mongoose from 'mongoose';
import testJob from './jobs/testJob';
import sendPrescriptions from './jobs/sendPrecriptions';
import deletePrescriptions from './jobs/deletePrescriptions';
import { Collection } from 'mongodb';

class AgendaService {
    private static instance: AgendaService;
    private agenda!: Agenda;
    private isInitialized = false;

    private constructor() { }

    public static getInstance(): AgendaService {
        if (!AgendaService.instance) {
            AgendaService.instance = new AgendaService();
        }
        return AgendaService.instance;
    }

    private async initialize() {
        if (this.isInitialized) {
            return;
        }

        // Asegurarse de que Mongoose esté conectado antes de crear Agenda
        if (mongoose.connection.readyState !== 1) {
            await new Promise((resolve) => {
                mongoose.connection.once('connected', resolve);
            });
        }

        // Ahora sí crear la instancia de Agenda con la conexión de Mongoose
        this.agenda = new Agenda({
            mongo: mongoose.connection.db as any,
            db: { collection: 'agendaJobs' },
            processEvery: '30 seconds',
            maxConcurrency: 20,
            defaultConcurrency: 5,
            defaultLockLifetime: 10000
        });

        this.defineJobs();
        this.agenda.on('ready', () => {
            // eslint-disable-next-line no-console
            console.log('📅 Agenda.js ready and connected to MongoDB');
        });

        await this.agenda.start();
        this.isInitialized = true;
        // eslint-disable-next-line no-console
        console.log('✅ Agenda service initialized successfully');
    }

    private defineJobs() {
        // Job Ejemplo para testear el funcionamiento
        this.agenda.define('test-job', { concurrency: 10 }, async (job: Job) => {
            await testJob(job);
        });

        // Job para envio de recetas a andes
        this.agenda.define('send-prescriptions', { concurrency: 10 }, async (job: Job) => {
            await sendPrescriptions(job);
        });

        // Job para eliminación física de recetas eliminadas lógicamente
        this.agenda.define('delete-prescriptions', { concurrency: 1 }, async (job: Job) => {
            await deletePrescriptions(job);
        });
    }

    private getCollection(): Collection {
        return (this.agenda as any)._collection;
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
        const agendaJobs = this.getCollection();
        let result: any = 0;
        const ids = query.map((id: string) => mongoose.Types.ObjectId(id));
        result = await agendaJobs.deleteMany({ _id: { $in: ids } });
        return result.deletedCount || 0;
    }

    public async cancelAllJobs(jobName: string): Promise<number> {
        await this.initialize();
        const result = await this.agenda.cancel({ name: jobName });
        return result || 0;
    }

    public async removeJobs(query: any): Promise<number> {
        await this.initialize();
        const jobs = await this.agenda.jobs(query);

        await this.agenda.cancel(query);

        const agendaJobs = this.getCollection();
        if (agendaJobs) {
            const result = await agendaJobs.deleteMany(query);
            return result.deletedCount || 0;
        }

        return jobs.length;
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

    // programar envío de recetas
    public async schedulePrescriptionJob(prescriptionData: {
        when?: string | Date;
    }): Promise<void> {
        const { when } = prescriptionData;
        await this.scheduleJob('send prescription', {}, when);
    }

    // programar eliminación de recetas
    public async scheduleDeletePrescriptionJob(data: {
        days?: number;
        when?: string | Date;
    }): Promise<void> {
        const { when, days } = data;
        await this.scheduleJob('delete-prescriptions', { days }, when || '0 0 * * *'); // Default to every day at midnight if no 'when'
    }

    public async getAgendaInstance(): Promise<Agenda> {
        await this.initialize();
        return this.agenda;
    }

    public async waitForInitialization(): Promise<void> {
        await this.initialize();
    }

    public getAgenda(): Agenda {
        if (!this.isInitialized || !this.agenda) {
            throw new Error('Agenda service not initialized. Call waitForInitialization() first.');
        }
        return this.agenda;
    }

    public async setupAutomaticTasks(): Promise<void> {
        await this.initialize();
        // eslint-disable-next-line no-console
        console.log('🕒 Tareas automáticas configuradas');
    }
}

export default AgendaService;
