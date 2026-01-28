import { Request, Response } from 'express';
import IUser from '../interfaces/user.interface';
import User from '../models/user.model';
import { renderHTML, MailOptions, sendMail } from '../utils/roboSender/sendEmail';
import Role from '../models/role.model';
import IRole from '../interfaces/role.interface';
class UsersController {
    public index = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { offset = 0, limit = 10, searchTerm } = req.query;

            // Construir query base
            let query: any = {};

            // Si hay término de búsqueda, agregar condiciones de búsqueda
            if (searchTerm) {
                query = {
                    $or: [
                        { email: { $regex: searchTerm, $options: 'i' } },
                        { username: { $regex: searchTerm, $options: 'i' } },
                        { businessName: { $regex: searchTerm, $options: 'i' } },
                        { firstName: { $regex: searchTerm, $options: 'i' } },
                        { lastName: { $regex: searchTerm, $options: 'i' } }
                    ]
                };
            }

            const users: IUser[] | null = await User.find(query, { password: 0, refreshToken: 0, authenticationToken: 0 })
                .populate('roles', 'role')
                .sort({ createdAt: -1 })
                .skip(Number(offset))
                .limit(Number(limit));

            const total = await User.countDocuments(query);

            return res.status(200).json({
                users,
                total,
                offset: Number(offset),
                limit: Number(limit)
            });
        } catch (e) {
            return res.status(500).json({ mensaje: `${e}` });
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

    public searchByTerm = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { searchTerm } = req.query;
            const { offset = 0, limit = 10 } = req.query;

            if (!searchTerm) {
                return res.status(400).json({ mensaje: 'Término de búsqueda requerido' });
            }

            // Crear query para buscar por nombre, email o CUIL
            const searchQuery = {
                $or: [
                    { email: { $regex: searchTerm, $options: 'i' } },
                    { firstName: { $regex: searchTerm, $options: 'i' } },
                    { lastName: { $regex: searchTerm, $options: 'i' } },
                    { businessName: { $regex: searchTerm, $options: 'i' } },
                    { cuil: { $regex: searchTerm, $options: 'i' } }
                ]
            };

            const users: IUser[] | null = await User.find(searchQuery, { password: 0, refreshToken: 0, authenticationToken: 0 })
                .populate('roles', 'role')
                .sort({ createdAt: -1 })
                .skip(Number(offset))
                .limit(Number(limit));

            const total = await User.countDocuments(searchQuery);

            return res.status(200).json({
                users,
                total,
                offset: Number(offset),
                limit: Number(limit)
            });
        } catch (e) {
            return res.status(500).json({ mensaje: `${e}` });
        }
    };

    public update = async (req: Request, res: Response): Promise<Response> => {
        try {
            if (!req.body || !req.body._id) {
                return res.status(400).json({ mensaje: 'Request body vacío o falta el ID del usuario' });
            }

            const { _id, email, username, businessName, roles: newRoles, isActive, ...otherFields } = req.body;

            // Buscar el usuario actual
            const currentUser: IUser | null = await User.findById(_id).populate('roles', 'role');
            if (!currentUser) {
                return res.status(404).json({ mensaje: 'Usuario no encontrado' });
            }

            // Preparar los datos a actualizar
            const updateData: any = { ...otherFields };

            // 1. Manejar actualización de estado (isActive)
            if (typeof isActive !== 'undefined') {
                this.prepareStatusUpdate(isActive, currentUser, req.user as IUser, updateData);
            }

            // 2. Manejar actualización de email (y username si es farmacéutico)
            let emailChanged = false;
            const oldEmail = currentUser.email;

            if (email && email !== currentUser.email) {
                try {
                    await this.validateAndPrepareEmailUpdate(email, _id, currentUser, updateData);
                    emailChanged = true;
                } catch (error) {
                    return res.status(400).json({ mensaje: error.message });
                }
            }

            // 3. Manejar actualización de roles
            if (newRoles && Array.isArray(newRoles)) {
                try {
                    await this.validateAndPrepareRolesUpdate(newRoles, updateData);
                } catch (error) {
                    return res.status(400).json({ mensaje: error.message });
                }
            }

            // 4. Manejar actualización de username
            // Solo si no fue actualizado previamente (por ejemplo, al cambiar email de farmacia)
            if (!updateData.username && username && username !== currentUser.username) {
                const existingUser = await User.findOne({ username, _id: { $ne: _id } });
                if (existingUser) {
                    return res.status(400).json({ mensaje: 'El nombre de usuario ya está en uso' });
                }
                updateData.username = username;
            }

            // 4. Manejar businessName
            if (businessName) {
                updateData.businessName = businessName;
            }

            // Agregar timestamp de actualización
            updateData.updatedAt = new Date();

            // Realizar la actualización
            const result = await User.findOneAndUpdate(
                { _id },
                updateData,
                {
                    new: true,
                    projection: { password: 0, refreshToken: 0, authenticationToken: 0 },
                    runValidators: false
                }
            ).populate('roles', 'role');

            // 5. Enviar notificación de cambio de email si corresponde
            if (emailChanged && result && oldEmail) {
                // Ejecutar el envío de email de forma asíncrona
                this.sendEmailChangeNotification(result, oldEmail, email).catch(error => {
                    // eslint-disable-next-line no-console
                    console.error('Error enviando notificación de cambio de email:', error);
                });
            }

            return res.status(200).json(result);

        } catch (e) {
            console.error('Error al actualizar usuario:', e);
            return res.status(500).json({ mensaje: `${e}` });
        }
    };

    /**
     * Helper to handle user status updates (isActive)
     */
    private prepareStatusUpdate(isActive: boolean, currentUser: IUser, updatingUser: IUser, updateData: any): void {
        if (isActive !== currentUser.isActive) {
            updateData.isActive = isActive;
            // Actualizar el campo activation con la información del cambio
            updateData.activation = {
                updatedAt: new Date(),
                updatedBy: updatingUser._id
            };
        }
    }

    /**
     * Helper to validate and prepare email updates
     * Handles regex validation, uniqueness, and pharmacist username syncing
     */
    private validateAndPrepareEmailUpdate = async (newEmail: string, userId: string, currentUser: IUser, updateData: any): Promise<void> => {
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            throw new Error('Formato de email inválido');
        }

        // Verificar que el email no esté en uso por otro usuario
        const existingEmailUser = await User.findOne({ email: newEmail, _id: { $ne: userId } });
        if (existingEmailUser) {
            throw new Error('El email ya está en uso por otro usuario');
        }

        updateData.email = newEmail;

        // Verificar si el usuario tiene rol de farmacia
        const isPharmacist = currentUser.roles.some((role: IRole) => role.role === 'pharmacist');

        // Si es farmacia, actualizar también el username con el email
        if (isPharmacist) {
            // Verificar que el nuevo username (email) no esté en uso
            const existingUsernameUser = await User.findOne({ username: newEmail, _id: { $ne: userId } });
            if (existingUsernameUser) {
                throw new Error('El email ya está en uso como username por otro usuario');
            }
            updateData.username = newEmail;
        }
    };

    /**
     * Helper to validate and prepare role updates
     */
    private validateAndPrepareRolesUpdate = async (newRoles: string[], updateData: any): Promise<void> => {
        // Validar que los roles existan
        const roleIds = newRoles.map(roleId => roleId);
        const validRoles = await Role.find({ _id: { $in: roleIds } });

        if (validRoles.length !== newRoles.length) {
            throw new Error('Uno o más roles especificados no existen');
        }

        updateData.roles = newRoles;
    };

    public create = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { email, username, businessName, enrollment, cuil, roles, password } = req.body;

            // Verificar que el email no esté en uso (si se proporciona)
            if (email) {
                const existingEmailUser = await User.findOne({ email });
                if (existingEmailUser) {
                    return res.status(400).json({ mensaje: 'El email ya está en uso' });
                }
            }

            // Verificar que el username no esté en uso (si se proporciona)
            if (username) {
                const existingUsernameUser = await User.findOne({ username });
                if (existingUsernameUser) {
                    return res.status(400).json({ mensaje: 'El nombre de usuario ya está en uso' });
                }
            }

            // Crear el nuevo usuario
            const userData: any = {};

            // Agregar campos si se proporcionan
            Object.assign(userData, {
                ...(email && { email }),
                ...(username && { username }),
                ...(businessName && { businessName }),
                ...(enrollment && { enrollment }),
                ...(cuil && { cuil }),
                ...(password && { password }),
                ...(roles && Array.isArray(roles) && { roles })
            });

            // Campos por defecto
            userData.isActive = true;
            userData.createdAt = new Date();

            const newUser = new User(userData);
            await newUser.save();

            // Si hay roles, también actualizar la referencia en los roles
            if (roles && Array.isArray(roles) && roles.length > 0) {
                await Role.updateMany(
                    { _id: { $in: roles } },
                    { $push: { users: newUser._id } }
                );
            }

            // Retornar el usuario creado sin campos sensibles
            const userResponse = await User.findById(newUser._id, {
                password: 0,
                refreshToken: 0,
                authenticationToken: 0
            }).populate('roles', 'role');

            return res.status(201).json({
                mensaje: 'Usuario creado exitosamente',
                user: userResponse
            });

        } catch (e) {
            return res.status(500).json({ mensaje: 'Error interno del servidor' });
        }
    };
};

export default new UsersController;
