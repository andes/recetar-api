import { Request, Response } from 'express';
import IUser from '../interfaces/user.interface';
import User from '../models/user.model';
import { renderHTML, MailOptions, sendMail } from '../utils/roboSender/sendEmail';
class UsersController {
    public index = async (req: Request, res: Response): Promise<Response> => {
        try {
            const users: IUser[] | null = await User.find({}, { password: 0, refreshToken: 0, authenticationToken: 0 }).populate('roles', 'role');
            return res.status(200).json(users);
        } catch (e) {
            return res.status(500).json({ mensaje: `${e}` });
        }
    };

    public update = async (req: Request, res: Response): Promise<Response> => {
        try {
            if (req.body) {
                let oldEmail: string | null = null;

                // Verificar si se está actualizando el email
                if (req.body.email) {
                    const emailExists = await this.validateEmailUniqueness(req.body.email, req.body._id);
                    if (emailExists) {
                        return res.status(400).json({ mensaje: 'El email ya está registrado por otro usuario' });
                    }

                    // Obtener el email anterior para enviar notificación
                    const currentUser = await User.findById(req.body._id);
                    if (currentUser && currentUser.email) {
                        oldEmail = currentUser.email;
                    }
                }

                const result = await User.findOneAndUpdate({ _id: req.body._id }, req.body, { new: true, projection: { password: 0, refreshToken: 0, authenticationToken: 0 } }).populate('roles', 'role');

                if (oldEmail && req.body.email && oldEmail !== req.body.email && result) {
                    // Ejecutar el envío de email de forma asíncrona para no bloquear la respuesta
                    this.sendEmailChangeNotification(result, oldEmail, req.body.email).catch(error => {
                        console.error('Error enviando notificación de cambio de email:', error);
                    });
                }

                return res.status(200).json(result);
            } else {
                return res.status(400).json({ mensaje: 'Request body vacío' });
            }
        } catch (e) {
            return res.status(500).json({ mensaje: `${e}` });
        }
    };

    /**
* Valida que el email no esté siendo usado por otro usuario
* @param email - Email a validar
* @param userId - ID del usuario actual (para excluirlo de la búsqueda)
* @returns true si el email ya existe, false si está disponible
*/
    private validateEmailUniqueness = async (email: string, userId: string): Promise<boolean> => {
        try {
            const existingUser = await User.findOne({
                email,
                _id: { $ne: userId }
            });
            return !!existingUser;
        } catch (error) {
            throw new Error(`Error validating email uniqueness: ${error}`);
        }
    };

    public getUserInfo = async (req: Request, res: Response): Promise<Response> => {
        // obtenemos la información personal del usuario por su ID
        const { id } = req.params;

        try {
            // Validar que se proporcione el ID
            if (!id) {
                return res.status(400).json({ message: 'ID de usuario requerido' });
            }

            // Buscar el usuario por ID y excluir información sensible
            const user: IUser | null = await User.findById(id)
                .select('-password -refreshToken -authenticationToken')
                .populate('roles', 'role description');

            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            // Verificar que el usuario esté activo
            if (!user.isActive) {
                return res.status(403).json({ message: 'Usuario inactivo' });
            }

            // Retornar la información personal del usuario
            return res.status(200).json({
                id: user._id,
                username: user.username,
                email: user.email,
                businessName: user.businessName,
                enrollment: user.enrollment,
                cuil: user.cuil,
                roles: user.roles,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                lastLogin: user.lastLogin,
                isActive: user.isActive
            });

        } catch (err) {
            return res.status(500).json({ message: 'Error interno del servidor' });
        }
    };

    /**
* Envía un email de notificación cuando se cambia el email del usuario
* @param user - Usuario al que se le cambió el email
* @param oldEmail - Email anterior del usuario
* @param newEmail - Nuevo email del usuario
*/
    private sendEmailChangeNotification = async (user: IUser, oldEmail: string, newEmail: string): Promise<void> => {
        try {
            const extras: any = {
                titulo: 'Cambio de email',
                usuario: user,
                oldEmail,
                newEmail,
                dateTime: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
                url: `${process.env.APP_DOMAIN || 'https://recetar.andes.gob.ar'}`,
            };

            // Enviar notificación al email anterior
            const htmlToSendOld = await renderHTML('emails/email-change.html', extras);
            const optionsOld: MailOptions = {
                from: `${process.env.EMAIL_USERNAME}`,
                to: oldEmail,
                subject: 'Notificación de cambio de email - RecetAR',
                text: '',
                html: htmlToSendOld,
                attachments: null
            };
            await sendMail(optionsOld);

            // Enviar confirmación al nuevo email
            const htmlToSendNew = await renderHTML('emails/email-change.html', extras);
            const optionsNew: MailOptions = {
                from: `${process.env.EMAIL_USERNAME}`,
                to: newEmail,
                subject: 'Confirmación de cambio de email - RecetAR',
                text: '',
                html: htmlToSendNew,
                attachments: null
            };
            await sendMail(optionsNew);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error enviando notificación de cambio de email:', error);
        }
    };
};

export default new UsersController;
