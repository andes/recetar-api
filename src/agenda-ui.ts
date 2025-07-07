import express from 'express';
import Agenda, { Job } from 'agenda';
import { env } from './config/config';

// Importación dinámica de Agendash
const Agendash = require('agendash');

class AgendaUIServer {
    protected app: express.Application;
    protected agenda: Agenda;

    constructor() {
        this.app = express();
        this.agenda = new Agenda();
        this.setupAgenda();
        this.config();
    }

    setupAgenda() {
        // Configuración de Agenda usando la misma conexión de MongoDB
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

        // Definir algunos jobs de ejemplo
        this.defineExampleJobs();
    }

    defineExampleJobs() {
        // Job de ejemplo: envío de email
        this.agenda.define('send email', { concurrency: 10 }, async (job: Job) => {
            const { to, subject, body } = job.attrs.data as { to: string; subject: string; body: string };
            console.log(`Enviando email a: ${to}, Asunto: ${subject}`);
            // lógica del envío de email
        });

        
    }

    async config() {
        // Configuración del puerto para la UI de Agenda
        const port = process.env.AGENDA_UI_PORT || 3001;
        this.app.set('port', port);

        // Middleware básico
        this.app.use(express.json());
        
        // Montar Agendash en la ruta raíz
        this.app.use('/', Agendash(this.agenda));

        // Ruta de información
        this.app.get('/info', (req, res) => {
            res.json({
                service: 'Agenda.js UI',
                version: '1.0.0',
                description: 'Interfaz web para gestionar trabajos programados',
                agenda: {
                    collection: 'agendaJobs',
                    processEvery: '30 seconds'
                }
            });
        });

        // Inicializar agenda
        await this.agenda.start();
        
        // Programar algunos jobs de ejemplo (opcional)
        await this.scheduleExampleJobs();
    }

    async scheduleExampleJobs() {
        
    }

    async start() {
        this.app.listen(this.app.get('port'), () => {
            console.log(`🚀 Agenda.js UI running on port ${this.app.get('port')}`);
            console.log(`📊 Dashboard available at: http://localhost:${this.app.get('port')}`);
        });
    }

    async gracefulShutdown() {
        console.log('Cerrando Agenda.js UI...');
        await this.agenda.stop();
        process.exit(0);
    }
}

// Instancia del servidor
const agendaUIServer = new AgendaUIServer();

// Manejo de cierre graceful
process.on('SIGTERM', () => agendaUIServer.gracefulShutdown());
process.on('SIGINT', () => agendaUIServer.gracefulShutdown());

// Iniciar el servidor
agendaUIServer.start().catch(console.error);

export default agendaUIServer;
