import { Request, Response } from 'express';
import AgendaService from '../agenda/agenda.service';
import { ObjectID } from 'mongodb';


class JobsController {
    private agendaService: AgendaService;

    constructor() {
        this.agendaService = AgendaService.getInstance();
    }

    // Programar un email inmediato
    public scheduleEmail = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { to, subject, body, template, when } = req.body;

            if (!to || !subject || !body) {
                return res.status(400).json({
                    success: false,
                    message: 'Los campos to, subject y body son obligatorios'
                });
            }

            await this.agendaService.scheduleEmailJob({
                to,
                subject,
                body,
                template,
                when
            });

            return res.status(200).json({
                success: true,
                message: when ?
                    `Email programado para ${when}` :
                    'Email programado para envío inmediato',
                data: { to, subject, when }
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error programando email:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    };

    public programarEnvioRecetas = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { when } = req.body;

            // Programar el trabajo de envío de recetas
            await this.agendaService.schedulePrescriptionJob({ when });

            return res.status(200).json({
                success: true,
                message: when ? `Recetas programadas para envío en ${when}` : 'Recetas programadas para envío inmediato',
                data: { when }
            });
        } catch (error) {
            console.error('Error programando envio de recetas:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    };


    // Obtener trabajos programados
    public getJobs = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { name, userId, limit = 50 } = req.query;

            const query: any = {};
            if (name) {query.name = name;}
            if (userId) {query['data.userId'] = userId;}

            const jobs = await this.agendaService.getJobs(query);
            const limitedJobs = jobs.slice(0, parseInt(limit as string, 10));

            const jobsData = limitedJobs.map(job => ({
                id: job.attrs._id,
                name: job.attrs.name,
                data: job.attrs.data,
                nextRunAt: job.attrs.nextRunAt,
                lastRunAt: job.attrs.lastRunAt,
                repeatInterval: job.attrs.repeatInterval,
                repeatTimezone: job.attrs.repeatTimezone,
                failedAt: job.attrs.failedAt,
                failReason: job.attrs.failReason,
                lockedAt: job.attrs.lockedAt,
                disabled: job.attrs.disabled
            }));

            return res.status(200).json({
                success: true,
                message: 'Trabajos obtenidos exitosamente',
                data: jobsData,
                count: jobsData.length,
                totalCount: jobs.length
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error obteniendo trabajos:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    };

    // Cancelar trabajos
    public cancelJobs = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { name, userId, jobId } = req.body;

            if (!name && !userId && !jobId) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe especificar al menos name, userId o jobId'
                });
            }

            const query: any = {};
            if (jobId) {
                query._id = jobId;
            } else {
                if (name) {query.name = name;}
                if (userId) {query['data.userId'] = userId;}
            }

            const canceledCount = await this.agendaService.cancelJob(query);

            return res.status(200).json({
                success: true,
                message: `${canceledCount} trabajo(s) cancelado(s)`,
                data: { canceledCount, query }
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error cancelando trabajos:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    };

    // Programar trabajo personalizado
    public scheduleCustomJob = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { jobName, data, when } = req.body;

            if (!jobName) {
                return res.status(400).json({
                    success: false,
                    message: 'El campo jobName es obligatorio'
                });
            }

            await this.agendaService.scheduleJob(jobName, data || {}, when);

            return res.status(200).json({
                success: true,
                message: when ?
                    `Trabajo '${jobName}' programado para ${when}` :
                    `Trabajo '${jobName}' programado para ejecución inmediata`,
                data: { jobName, data, when }
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error programando trabajo personalizado:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    };

    // Obtener estadísticas de trabajos
    public getJobStats = async (req: Request, res: Response): Promise<Response> => {
        try {
            const allJobs = await this.agendaService.getJobs({});

            const stats = {
                total: allJobs.length,
                running: allJobs.filter(job => job.attrs.lockedAt && !job.attrs.lastFinishedAt).length,
                scheduled: allJobs.filter(job => job.attrs.nextRunAt && job.attrs.nextRunAt > new Date()).length,
                failed: allJobs.filter(job => job.attrs.failedAt).length,
                completed: allJobs.filter(job => job.attrs.lastFinishedAt && !job.attrs.failedAt).length,
                disabled: allJobs.filter(job => job.attrs.disabled).length,
                recurring: allJobs.filter(job => job.attrs.repeatInterval).length,
                byType: {} as { [key: string]: number }
            };

            // Contar por tipo de trabajo
            allJobs.forEach(job => {
                const jobName = job.attrs.name;
                stats.byType[jobName] = (stats.byType[jobName] || 0) + 1;
            });

            return res.status(200).json({
                success: true,
                message: 'Estadísticas obtenidas exitosamente',
                data: stats
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error obteniendo estadísticas:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    };

    // Eliminar trabajos permanentemente (DELETE method)
    public deleteJobs = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { jobIds } = req.body;
            console.log('Request to delete jobs with IDs:', jobIds);

            if (!jobIds && !jobIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe especificar al menos un jobId para eliminar'
                });
            }

            // Luego los eliminamos permanentemente
            const deletedCount = await this.agendaService.cancelJob(jobIds);

            // const deletedCount = await this.agendaService.

            return res.status(200).json({
                success: true,
                message: `${deletedCount} trabajo(s) eliminado(s) permanentemente`,
                data: {
                    deletedCount,
                    jobIds
                }
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    };
}

export default new JobsController();
