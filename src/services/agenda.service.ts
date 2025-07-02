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
            
            // Aquí integrarías con tu servicio de email existente
            // Por ejemplo, si tienes un servicio de nodemailer:
            // await this.sendEmailWithNodemailer(to, subject, body, template);
            
            // Simular tiempo de procesamiento
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(`✅ Email enviado exitosamente a: ${to}`);
        });

        // Job para notificaciones de prescripciones vencidas
        this.agenda.define('check expired prescriptions', async (job: Job) => {
            console.log('🔍 Verificando prescripciones vencidas...');
            
            // Aquí integrarías con tu modelo de Prescription
            // const expiredPrescriptions = await PrescriptionModel.find({ 
            //     expiryDate: { $lt: new Date() },
            //     status: 'active'
            // });
            
            // Programar notificaciones para cada prescripción vencida
            // for (const prescription of expiredPrescriptions) {
            //     await this.scheduleJob('send notification', {
            //         userId: prescription.userId,
            //         message: `Tu prescripción ${prescription.id} ha vencido`,
            //         type: 'prescription_expired'
            //     });
            // }
            
            console.log('✅ Verificación de prescripciones completada');
        });

        // Job para recordatorios de medicación
        this.agenda.define('medication reminder', async (job: Job) => {
            const { userId, medicationName, dosage } = job.attrs.data as { 
                userId: string; 
                medicationName: string; 
                dosage: string 
            };
            
            console.log(`💊 Enviando recordatorio de medicación para usuario ${userId}: ${medicationName} - ${dosage}`);
            
            // Aquí integrarías con tu servicio de notificaciones
            // await this.sendNotification(userId, {
            //     title: 'Recordatorio de medicación',
            //     message: `Es hora de tomar ${medicationName} - ${dosage}`,
            //     type: 'medication_reminder'
            // });
        });

        // Job para generar reportes automáticos
        this.agenda.define('generate automatic report', async (job: Job) => {
            const { reportType, recipients, dateRange } = job.attrs.data as { 
                reportType: string; 
                recipients: string[]; 
                dateRange: { start: Date; end: Date } 
            };
            
            console.log(`📊 Generando reporte automático: ${reportType}`);
            
            // Aquí integrarías con tu lógica de generación de reportes
            // const reportData = await this.generateReport(reportType, dateRange);
            // const reportFile = await this.createReportFile(reportData);
            
            // Enviar por email a los destinatarios
            // for (const recipient of recipients) {
            //     await this.scheduleJob('send email', {
            //         to: recipient,
            //         subject: `Reporte ${reportType} - ${new Date().toISOString().split('T')[0]}`,
            //         body: `Adjunto encontrarás el reporte ${reportType} solicitado.`,
            //         attachments: [reportFile]
            //     });
            // }
            
            console.log('✅ Reporte generado y enviado');
        });

        // Job para limpieza de datos temporales
        this.agenda.define('cleanup temp data', async (job: Job) => {
            console.log('🧹 Iniciando limpieza de datos temporales...');
            
            // Aquí integrarías con tus modelos para limpiar datos antiguos
            // const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 días atrás
            
            // Limpiar sesiones expiradas
            // await SessionModel.deleteMany({ expiresAt: { $lt: new Date() } });
            
            // Limpiar logs antiguos
            // await LogModel.deleteMany({ createdAt: { $lt: cutoffDate } });
            
            // Limpiar archivos temporales
            // await TempFileModel.deleteMany({ createdAt: { $lt: cutoffDate } });
            
            console.log('✅ Limpieza de datos completada');
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

    public async scheduleMedicationReminder(reminderData: {
        userId: string;
        medicationName: string;
        dosage: string;
        reminderTime: string | Date;
    }): Promise<void> {
        const { reminderTime, ...data } = reminderData;
        await this.scheduleJob('medication reminder', data, reminderTime);
    }

    public async scheduleRecurringMedicationReminder(reminderData: {
        userId: string;
        medicationName: string;
        dosage: string;
        interval: string; // ej: '0 8,12,20 * * *' para 8am, 12pm, 8pm diario
    }): Promise<void> {
        const { interval, ...data } = reminderData;
        await this.scheduleRecurringJob(interval, 'medication reminder', data);
    }

    public async setupAutomaticTasks(): Promise<void> {
        await this.initialize();
        
        // Verificar prescripciones vencidas diariamente a las 9 AM
        await this.scheduleRecurringJob('0 9 * * *', 'check expired prescriptions');
        
        // Limpiar datos temporales semanalmente los domingos a las 2 AM
        await this.scheduleRecurringJob('0 2 * * 0', 'cleanup temp data');
        
        // Generar reporte mensual el primer día del mes a las 6 AM
        await this.scheduleRecurringJob('0 6 1 * *', 'generate automatic report', {
            reportType: 'monthly_summary',
            recipients: ['admin@recetar.com'],
            dateRange: {
                start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                end: new Date(new Date().getFullYear(), new Date().getMonth(), 0)
            }
        });
        
        console.log('🕒 Tareas automáticas configuradas');
    }
}

export default AgendaService;
