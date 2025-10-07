import { Request, Response } from 'express';
import IUser from '../interfaces/user.interface';
import User from '../models/user.model';
import Role from '../models/role.model';
import IRole from '../interfaces/role.interface';
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
            if (!req.body || !req.body._id) {
                return res.status(400).json({ mensaje: 'Request body vacío o falta el ID del usuario' });
            }

            const { _id, email, username, businessName, roles: newRoles, ...otherFields } = req.body;

            // Buscar el usuario actual
            const currentUser: IUser | null = await User.findById(_id).populate('roles', 'role');
            if (!currentUser) {
                return res.status(404).json({ mensaje: 'Usuario no encontrado' });
            }

            // Preparar los datos a actualizar
            const updateData: any = { ...otherFields };

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
};

export default new UsersController;
