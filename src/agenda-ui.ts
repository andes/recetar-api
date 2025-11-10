import express from 'express';
import Agenda, { Job } from 'agenda';
import jobsRoutes from './routes/jobs';
import AgendaService from './services/agenda.service';
// Cargar variables de entorno
import './config/config';

// Importación dinámica de Agendash
const Agendash = require('agendash');

class AgendaUIServer {
    protected app: express.Application;
    private agendaService: AgendaService;
    private agenda!: Agenda; // Usamos definite assignment assertion
    private isConfigured = false;

    constructor() {
        this.app = express();
        this.agendaService = AgendaService.getInstance();
        this.basicConfig();
    }

    private basicConfig() {
        // Configuración básica del puerto
        const port = process.env.AGENDA_UI_PORT || '3001';
        this.app.set('port', port);

        // Middleware básico
        this.app.use(express.json());

        // Montar las rutas de API ANTES que Agendash para evitar conflictos
        this.app.use('/api/jobs', jobsRoutes);

        // Ruta de información
        this.app.get('/api/info', (req, res) => {
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
    }

    async initializeAgenda() {
        if (this.isConfigured) {
            return;
        }
        
        // Esperar a que el servicio esté completamente inicializado
        await this.agendaService.waitForInitialization();
        this.agenda = this.agendaService.getAgenda();
        
        // Configurar Agendash después de tener la instancia de Agenda
        this.app.use('/', Agendash(this.agenda));
        this.isConfigured = true;
    }


    async start() {
        // Inicializar Agenda antes de comenzar el servidor
        await this.initializeAgenda();
        
        const port = this.app.get('port');
        this.app.listen(port, () => {
            // eslint-disable-next-line no-console
            console.log(`🚀 Agenda.js UI running on port ${port}`);
            // eslint-disable-next-line no-console
            console.log(`📊 Dashboard available at: http://localhost:${port}`);
        });
    }

    async gracefulShutdown() {
        // eslint-disable-next-line no-console
        console.log('Cerrando Agenda.js UI...');
        // No necesitamos parar agenda aquí ya que es una instancia compartida
        // El servicio principal se encarga del shutdown
        await this.agendaService.gracefulShutdown();
        process.exit(0);
    }
}

// Función para inicializar y arrancar el servidor
async function startServer() {
    const agendaUIServer = new AgendaUIServer();

    process.on('SIGTERM', () => agendaUIServer.gracefulShutdown());
    process.on('SIGINT', () => agendaUIServer.gracefulShutdown());

    await agendaUIServer.start();
}

// Iniciar el servidor
startServer().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Error starting Agenda UI server:', error);
    process.exit(1);
});

export default AgendaUIServer;
