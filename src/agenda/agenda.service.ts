import Agenda from 'agenda';
import mongoose from 'mongoose';

class AgendaService {
    private static instance: AgendaService;
    private agenda!: Agenda;
    private isInitialized = false;

    private constructor() {}

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

        if (mongoose.connection.readyState !== 1) {
            await new Promise<void>((resolve) => {
                mongoose.connection.once('connected', () => resolve());
            });
        }

        this.agenda = new Agenda({
            mongo: mongoose.connection.db as any,
            db: { collection: 'agendaJobs' },
            processEvery: '30 seconds',
            maxConcurrency: 20,
            defaultConcurrency: 5,
            defaultLockLifetime: 10000,
        });

        this.agenda.on('ready', () => {
            // eslint-disable-next-line no-console
            console.log('Agenda.js ready and connected to MongoDB');
        });

        await this.agenda.start();
        this.isInitialized = true;
        // eslint-disable-next-line no-console
        console.log('Agenda service initialized successfully');
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

    public async gracefulShutdown(): Promise<void> {
        if (this.isInitialized) {
            await this.agenda.stop();
        }
    }
}

export default AgendaService;
