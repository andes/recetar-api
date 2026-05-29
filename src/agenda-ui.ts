import express from 'express';
import Agenda from 'agenda';
import { initializeMongo } from './database/dbconfig';
import './config/config';
import AgendaService from './agenda/agenda.service';

const Agendash = require('agendash');

class AgendaUIServer {
    protected app: express.Application;
    private agendaService: AgendaService;
    private agenda!: Agenda;
    private isConfigured = false;

    constructor() {
        this.app = express();
        this.agendaService = AgendaService.getInstance();
        this.basicConfig();
    }

    private basicConfig() {
        const port = process.env.AGENDA_UI_PORT || '3001';
        this.app.set('port', port);

        this.app.use(express.json());

        this.app.get('/api/info', (_req, res) => {
            res.json({
                service: 'Agenda.js UI',
                version: '1.0.0',
                description: 'Interfaz web para gestionar trabajos programados',
                agenda: {
                    collection: 'agendaJobs',
                    processEvery: '30 seconds',
                },
            });
        });
    }

    async initializeAgenda() {
        if (this.isConfigured) {
            return;
        }

        await this.agendaService.waitForInitialization();
        this.agenda = this.agendaService.getAgenda();
        this.app.use('/', Agendash(this.agenda));
        this.isConfigured = true;
    }

    async start() {
        await initializeMongo();

        await this.initializeAgenda();
        const port = this.app.get('port');
        this.app.listen(port, () => {
            // eslint-disable-next-line no-console
            console.log(`Agenda.js UI running on port ${port}`);
            // eslint-disable-next-line no-console
            console.log(`Dashboard available at: http://localhost:${port}`);
        });
    }

    async gracefulShutdown() {
        // eslint-disable-next-line no-console
        console.log('Cerrando Agenda.js UI...');
        await this.agendaService.gracefulShutdown();
        process.exit(0);
    }
}

async function startServer() {
    const agendaUIServer = new AgendaUIServer();

    process.on('SIGTERM', () => agendaUIServer.gracefulShutdown());
    process.on('SIGINT', () => agendaUIServer.gracefulShutdown());

    await agendaUIServer.start();
}

startServer().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Error starting Agenda UI server:', error);
    process.exit(1);
});

export default AgendaUIServer;
