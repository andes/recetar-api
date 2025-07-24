import express from 'express';
import AgendaService from './services/agenda.service';

// Importación dinámica de Agendash
const Agendash = require('agendash');

class AgendaUIServer {
    protected app: express.Application;
    private agendaService: AgendaService;

    constructor() {
        this.app = express();
        this.agendaService = AgendaService.getInstance();
        this.config();
    }

    async config() {
        // Configuración del puerto para la UI de Agenda
        const port = process.env.AGENDA_UI_PORT || 3001;
        this.app.set('port', port);

        // Middleware básico
        this.app.use(express.json());
        
        // Obtener la instancia de agenda del servicio y montarla en Agendash
        const agendaInstance = await this.agendaService.getAgendaInstance();
        this.app.use('/', Agendash(agendaInstance));

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
    }


    async start() {
        this.app.listen(this.app.get('port'), () => {
            console.log(`🚀 Agenda.js UI running on port ${this.app.get('port')}`);
            console.log(`📊 Dashboard available at: http://localhost:${this.app.get('port')}`);
        });
    }

    async gracefulShutdown() {
        console.log('Cerrando Agenda.js UI...');
        // No necesitamos parar agenda aquí ya que es una instancia compartida
        // El servicio principal se encarga del shutdown
        await this.agendaService.gracefulShutdown();
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
