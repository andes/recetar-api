import { Request, Response } from 'express';
import IUser from '../interfaces/user.interface';
import User from '../models/user.model';
import { renderHTML, MailOptions, sendMail } from '../utils/roboSender/sendEmail';
import crypto from 'crypto';
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

    public requestEmailUpdate = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { email, userId } = req.body;

            if (!email) {
                return res.status(400).json({ mensaje: 'Email requerido' });
            }

            // Verificar si el email ya existe en otro usuario
            const emailExists = await this.validateEmailUniqueness(email, userId);
            if (emailExists) {
                return res.status(400).json({ mensaje: 'El email ya está registrado por otro usuario' });
            }

            // Generar token y expiración
            const token = crypto.randomBytes(20).toString('hex');
            const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

            const user = await User.findByIdAndUpdate(userId, {
                pendingEmail: email,
                emailConfirmationToken: token,
                emailConfirmationExpires: expires
            }, { new: true });

            if (!user) {
                return res.status(404).json({ mensaje: 'Usuario no encontrado' });
            }

            // Enviar email de confirmación
            await this.sendEmailUpdateConfirmation(user, email, token);

            return res.status(200).json({ mensaje: 'Se ha enviado un correo de confirmación a la nueva dirección.' });

        } catch (e) {
            return res.status(500).json({ mensaje: `${e}` });
        }
    };

    public confirmEmailUpdate = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({ mensaje: 'Token requerido' });
            }

            // Buscar usuario con el token y verificar expiración
            const user = await User.findOne({
                emailConfirmationToken: token,
                emailConfirmationExpires: { $gt: new Date() }
            }).populate('roles');

            if (!user) {
                return res.status(400).json({ mensaje: 'Token inválido o expirado' });
            }

            // Aplicar el cambio
            user.email = user.pendingEmail!;

            // Si es farmacia, actualizamos también el username
            const isPharmacy = user.roles.some((role: any) => role.role === 'pharmacist');
            if (isPharmacy) {
                user.username = user.pendingEmail!;
            }

            user.pendingEmail = undefined;
            user.emailConfirmationToken = undefined;
            user.emailConfirmationExpires = undefined;

            await user.save();

            return res.status(200).json({ mensaje: 'Email actualizado correctamente' });

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

    /**
     * Envía un email con el token para confirmar el cambio de email
     * @param user - Usuario
     * @param newEmail - Nuevo email
     * @param token - Token de confirmación
     */
    private sendEmailUpdateConfirmation = async (user: IUser, newEmail: string, token: string): Promise<void> => {
        try {
            const extras: any = {
                titulo: 'Confirmar cambio de email',
                usuario: user,
                url: `${process.env.APP_DOMAIN || 'https://recetar.andes.gob.ar'}/auth/confirm-update/${token}`
            };

            const htmlToSend = await renderHTML('emails/update-email.html', extras);
            const options: MailOptions = {
                from: `${process.env.EMAIL_USERNAME}`,
                to: newEmail,
                subject: 'Confirmar cambio de email - RecetAR',
                text: '',
                html: htmlToSend,
                attachments: null
            };
            await sendMail(options);
        } catch (error) {
            console.error('Error enviando confirmación de cambio de email:', error);
        }
    };
};

export default new UsersController;
