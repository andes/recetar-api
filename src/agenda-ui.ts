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

        // Definir algunos jobs de ejemplo (puedes agregar más según tus necesidades)
        this.defineExampleJobs();
    }

    defineExampleJobs() {
        // Job de ejemplo: envío de email
        this.agenda.define('send email', { concurrency: 10 }, async (job: Job) => {
            const { to, subject, body } = job.attrs.data as { to: string; subject: string; body: string };
            console.log(`Enviando email a: ${to}, Asunto: ${subject}`);
            // Aquí iría la lógica real de envío de email
            // Por ejemplo, usando nodemailer que ya tienes instalado
        });

        // Job de ejemplo: limpieza de datos
        this.agenda.define('cleanup old data', async (job: Job) => {
            console.log('Ejecutando limpieza de datos antiguos...');
            // Aquí iría la lógica de limpieza
        });

        // Job de ejemplo: generación de reportes
        this.agenda.define('generate report', async (job: Job) => {
            const { reportType, userId } = job.attrs.data as { reportType: string; userId: string };
            console.log(`Generando reporte ${reportType} para usuario ${userId}`);
            // Aquí iría la lógica de generación de reportes
        });

        // Job de ejemplo: notificaciones
        this.agenda.define('send notification', async (job: Job) => {
            const { userId, message, type } = job.attrs.data as { userId: string; message: string; type: string };
            console.log(`Enviando notificación ${type} a usuario ${userId}: ${message}`);
            // Aquí iría la lógica de notificaciones
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
        // Ejemplo: programar limpieza diaria
        await this.agenda.every('0 2 * * *', 'cleanup old data'); // A las 2 AM todos los días
        
        // Ejemplo: programar generación de reportes semanales
        await this.agenda.every('0 8 * * 1', 'generate report', { 
            reportType: 'weekly', 
            userId: 'system' 
        }); // Lunes a las 8 AM
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
