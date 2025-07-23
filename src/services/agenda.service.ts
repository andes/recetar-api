import Agenda, { Job } from 'agenda';
import { env } from '../config/config';
import Prescription from '../models/prescription.model';
import IPrescription, { PrescriptionSupply } from '../interfaces/prescription.interface';
import needle from 'needle';
import Professional from '../models/professional.model';
import User from '../models/user.model';

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

        // Job para envio de recetas a andes
        this.agenda.define('send prescription', { concurrency: 10 }, async (job: Job) => {
            console.log('Enviando receta a Andes...');
            const recetasPublicasPendientes = await Prescription.find({ status: 'Pendiente', ambito: 'publico' }).populate('obraSocial');
            if (recetasPublicasPendientes.length === 0) {
                console.log('No hay recetas pendientes para enviar a Andes.');
                return;
            } else {
                console.log(`Enviando ${recetasPublicasPendientes.length} recetas pendientes a Andes...`);
                recetasPublicasPendientes.forEach(async (receta: IPrescription) => {
                    const professional = await User.findById(receta.professional.userId);
                    if (!professional) {
                        console.error(`Profesional no encontrado para la receta ${receta._id}`);
                        return job.fail(`Profesional no encontrado para la receta ${receta._id}`);
                    }
                    const body = {
                        op: 'crearRecetar',
                        //idPrestacion: 'no se',
                        //idRegistro: 'no se',
                        paciente: {
                            id: receta.patient.idMPI? receta.patient.idMPI : receta.patient._id.toString(),
                            nombre: receta.patient.firstName,
                            apellido: receta.patient.lastName,
                            documento: receta.patient.dni,
                            sexo: receta.patient.sex.toLowerCase(),
                        },
                        profesional: {
                            id: receta.professional.userId,
                            nombreCompleto: professional.businessName,
                            matricula: receta.professional.enrollment,
                            username: professional.username,
                            cuil: receta.professional.cuil,
                        },
                        organizacion: {
                            nombre: 'RecetAR',
                        },
                        medicamentos: [{
                            diagnostico: receta.supplies[0].diagnostic || '',
                            concepto: receta.supplies[0].supply.snomedConcept,
                            // unidades: ,
                            cantidad: receta.supplies[0].quantityPresentation || 1,
                            cantEnvases: receta.supplies[0].quantity || 1,
                            dosisDiaria: {
                                // dosis: '',
                                // intervalo: '',
                                // dias: '',
                                notaMedica: receta.supplies[0].indication || ''
                            },
                            tratamientoProlongado: receta.triple ? true : false,
                            tiempoTratamiento: receta.triple ? '90 días' : null,
                            tipoReceta: receta.supplies[0].triplicate ? 'triplicado' : (receta.supplies[0].duplicate ? 'duplicado' : 'simple'),
                        }],
                        origenExterno: {
                            id: receta._id.toString(),
                            app: 'RecetAR',
                            fecha: new Date().toISOString(),
                        }
                    }
                    
                    console.log(`Enviando receta ${receta._id} a Andes...`);
                    const resp = await needle('post', `${process.env.ANDES_ENDPOINT}/modules/recetas`, body, {headers: { 'Authorization': process.env.JWT_MPI_TOKEN}});
                    if (resp.statusCode !== 200) {
                        console.error(`Error al enviar receta ${receta._id} a Andes: ${resp.statusCode}`);
                        return job.fail(`Error al enviar receta ${receta._id} a Andes: ${resp.statusCode}`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    console.log(`Receta ${receta._id} enviada exitosamente a Andes.`);
                });
            }
        })

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

    // programar envío de recetas
    public async schedulePrescriptionJob(prescriptionData: {
        when?: string | Date;
    }): Promise<void> {
        const { when } = prescriptionData;
        await this.scheduleJob('send prescription', when);
    }

    public async getAgendaInstance(): Promise<Agenda> {
        await this.initialize();
        return this.agenda;
    }

    public async setupAutomaticTasks(): Promise<void> {
        await this.initialize();
        
        
        console.log('🕒 Tareas automáticas configuradas');
    }
}

export default AgendaService;
