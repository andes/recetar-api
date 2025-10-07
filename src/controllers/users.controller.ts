import { Request, Response } from 'express';
import IUser from '../interfaces/user.interface';
import User from '../models/user.model';
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

            // Verificar si hay cambio en el campo isActive
            if (typeof isActive !== 'undefined' && isActive !== currentUser.isActive) {
                updateData.isActive = isActive;
                // Actualizar el campo activation con la información del cambio
                const updatingUser = req.user as IUser;
                updateData.activation = {
                    updatedAt: new Date(),
                    updatedBy: updatingUser._id
                };
            }

            // Manejar actualización de email
            if (email && email !== currentUser.email) {
                // Validar formato de email
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return res.status(400).json({ mensaje: 'Formato de email inválido' });
                }

                // Verificar que el email no esté en uso por otro usuario
                const existingEmailUser = await User.findOne({ email, _id: { $ne: _id } });
                if (existingEmailUser) {
                    return res.status(400).json({ mensaje: 'El email ya está en uso por otro usuario' });
                }

                updateData.email = email;

                // Verificar si el usuario tiene rol de farmacia
                const isPharmacist = currentUser.roles.some((role: IRole) => role.role === 'pharmacist');

                // Si es farmacia, actualizar también el username con el email
                if (isPharmacist) {
                    // Verificar que el nuevo username (email) no esté en uso
                    const existingUsernameUser = await User.findOne({ username: email, _id: { $ne: _id } });
                    if (existingUsernameUser) {
                        return res.status(400).json({ mensaje: 'El email ya está en uso como username por otro usuario' });
                    }
                    updateData.username = email;
                }
            }

            // Manejar actualización de businessName
            if (businessName) {
                updateData.businessName = businessName;
            }

            // Manejar actualización de roles
            if (newRoles && Array.isArray(newRoles)) {
                // Validar que los roles existan
                const roleIds = newRoles.map(roleId => roleId);
                const validRoles = await Role.find({ _id: { $in: roleIds } });

                if (validRoles.length !== newRoles.length) {
                    return res.status(400).json({ mensaje: 'Uno o más roles especificados no existen' });
                }

                updateData.roles = newRoles;
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
                    runValidators: true
                }
            ).populate('roles', 'role');

            if (!result) {
                return res.status(404).json({ mensaje: 'Usuario no encontrado' });
            }

            return res.status(200).json(result);

        } catch (e) {
            return res.status(500).json({ mensaje: 'Error interno del servidor' });
        }
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
                    return res.status(400).json({ mensaje: 'El username ya está en uso' });
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
