import Agenda, { Job } from 'agenda';
import { env } from '../config/config';
import needle from 'needle';
import User from '../models/user.model';
import mongoose from 'mongoose';
import PrescriptionAndes from '../models/prescriptionAndes.model';
import IPrescriptionAndes from '../interfaces/prescriptionAndes.interface';

class AgendaService {
    private static instance: AgendaService;
    private agenda: Agenda;
    private isInitialized = false;

    private constructor() {
        this.agenda = new Agenda({
            db: {
                address: process.env.MONGO_URI || env.MONGODB_CONNECTION || 'mongodb://localhost/recetar',
                collection: 'agendaJobs'
            },
            processEvery: '30 seconds',
            maxConcurrency: 20,
            defaultConcurrency: 5,
            defaultLockLifetime: 10000
        });
    }

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

        this.defineJobs();
        // Evento para manejar la inicialización completa
        this.agenda.on('ready', () => {
            console.log('📅 Agenda.js ready and connected to MongoDB');
        });

        await this.agenda.start();
        this.isInitialized = true;
        console.log('✅ Agenda service initialized successfully');
    }

    private defineJobs() {
        // Job para envío de emails. JOB Ejemplo para testear el funcionamiento
        this.agenda.define('send email', { concurrency: 10 }, async (job: Job) => {
            const { to, subject, body, template } = job.attrs.data as {
                to: string;
                subject: string;
                body: string;
                template?: string;
            };
            // eslint-disable-next-line no-console
            console.log(`📧 Enviando email a: ${to}, Asunto: ${subject}`);

            // Tiempo de procesamiento (logica de envío de email)
            await new Promise(resolve => setTimeout(resolve, 1000));
            // eslint-disable-next-line no-console
            console.log(`✅ Email enviado exitosamente a: ${to}`);
        });

        // Job para envio de recetas a andes
        this.agenda.define('send prescription', { concurrency: 10 }, async (job: Job) => {
            const errores = [];
            try {
                const recetasPublicasPendientes = await PrescriptionAndes.find({ status: 'vigente' });
                if (recetasPublicasPendientes.length === 0) {
                    return;
                } else {
                    recetasPublicasPendientes.forEach(async (receta: IPrescriptionAndes) => {
                        const body = receta;
                        const resp = await needle('post', `${process.env.ANDES_ENDPOINT}/modules/recetas`, body, { headers: { Authorization: process.env.JWT_MPI_TOKEN } });
                        if (resp.statusCode !== 200) {
                            errores.push(`Error enviando receta ID ${receta._id} a Andes. Código de estado: ${resp.statusCode}. Mensaje: ${resp.body.message}`);
                        }
                        if (resp.statusCode === 200) {
                            await PrescriptionAndes.findByIdAndDelete(receta._id);
                        }
                    });
                }
                if (errores.length > 0) {
                    throw new Error(`Recetas con errores: ${errores.length}`);
                }
            } catch (error) {
                errores.push(error);
                return job.fail(`Error en el job de envío de recetas a Andes: ${errores}`);
            }
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
        const collection = this.agenda._collection;
        console.log('Cancel job query:', query);
        console.log('colección de agenda:', collection);
        let result: any = 0;
        const ids = query.map((id: string) => mongoose.Types.ObjectId(id));
        console.log('Canceling jobs with IDs:', ids);
        result = await collection.deleteMany({ _id: { $in: ids } });
        console.log('Cancel job result:', result);
        return result.deletedCount || 0;
    }

    public async cancelAllJobs(jobName: string): Promise<number> {
        await this.initialize();
        const result = await this.agenda.cancel({ name: jobName });
        return result || 0;
    }

    public async removeJobs(query: any): Promise<number> {
        console.log('Removing jobs with query:', query);
        await this.initialize();
        const jobs = await this.agenda.jobs(query);

        // Primero cancelar los jobs activos
        await this.agenda.cancel(query);

        // Luego eliminar de la base de datos
        // Nota: Agenda.js no tiene un método directo para eliminar
        // pero podemos acceder a la colección directamente
        const collection = this.agenda._collection;
        if (collection && collection.deleteMany) {
            const result = await collection.deleteMany(query);
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

    // programar envío de recetas
    public async schedulePrescriptionJob(prescriptionData: {
        when?: string | Date;
    }): Promise<void> {
        const { when } = prescriptionData;
        await this.scheduleJob('send prescription', {}, when);
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
        console.log('🕒 Tareas automáticas configuradas');
    }
}

export default AgendaService;
