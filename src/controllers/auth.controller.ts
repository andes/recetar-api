import { Request, Response } from 'express';
import * as JWT from 'jsonwebtoken';
import { env, httpCodes } from '../config/config';
import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';

import IUser from '../interfaces/user.interface';
import User from '../models/user.model';
import IRole from '../interfaces/role.interface';
import Role from '../models/role.model';
import { renderHTML, MailOptions, sendMail } from '../utils/roboSender/sendEmail';
import needle from 'needle';
import moment from 'moment';


class AuthController {

  public register = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { username, email, enrollment, cuil, businessName, password, roleType, captcha } = req.body;

      // Verificación Token captcha
      if (!captcha) return res.status(403).json({ message: 'Body incompleto' });
      const captchaResp: any = await needle('post', 'https://challenges.cloudflare.com/turnstile/v0/siteverify', { secret: process.env.CF_SECRET_KEY, response: captcha })
      if (!captchaResp || captchaResp.body.success === false) return res.status(403).json("Conexión invalida");

      // Verificación de rol
      const role: IRole | null = await Role.findOne({ role: roleType });
      if (!role) return res.status(400).json({ message: 'No es posible registrar el usuario' });

      // Verificación de usuario ya registrado
      const posibleExistingUser: IUser | null = await User.findOne({ username: username });
      if (posibleExistingUser) return res.status(400).json({ message: 'No es posible registrar, el usuario ya existe' });

      if (roleType === "professional") {
        const resp = await needle('get', `${process.env.ANDES_ENDPOINT}/core/tm/profesionales/guia?documento=${username}`);
        if (!(resp.body && resp.body.length > 0 && resp.body[0].profesiones && resp.body[0].profesiones.length > 0)) {
          return res.status(400).json({ message: 'No se encuentra el profesional.' });
        }
        const professionalAndes = resp.body[0];
        const { profesiones } = professionalAndes;
        const lastProfesion = profesiones.find((p: any) => p.profesion.codigo == '1' || p.profesion.codigo == '23' || p.profesion.codigo == '2');
        const lastMatriculacion = lastProfesion.matriculacion[lastProfesion.matriculacion.length - 1];
        if (lastMatriculacion && (moment(lastMatriculacion.fin)) > moment() && lastMatriculacion.matriculaNumero.toString() === enrollment && cuil === professionalAndes.cuit) {
          const newUser = new User({ username, email, password, enrollment, cuil, businessName });
          newUser.roles.push(role);
          role.users.push(newUser);
          await newUser.save();
          await role.save();
          this.sendEmailNewUser(newUser);
          return res.status(200).json({
            newUser
          });
        }
      } else if (roleType === "pharmacist") {
        const { disposicionHabilitacion, vencimientoHabilitacion } = req.body;
        const resp = await needle('get', `${process.env.ANDES_ENDPOINT}/core/tm/farmacias?cuit=${username}&disposicionHabilitacion=${disposicionHabilitacion}`, { headers: { 'Authorization': process.env.JWT_MPI_TOKEN } });

        if (!(resp.body && resp.body.length > 0)) {
          return res.status(400).json({ message: 'No se encuentra el farmacia.' });
        }
        const pharmacyAndes = resp.body[0];
        const checkDisposicionFarmacia = pharmacyAndes.disposicionHabilitacion === disposicionHabilitacion ? true : false;
        const checkMatricula = pharmacyAndes.matriculaDTResponsable === enrollment ? true : false;
        const diferencia = moment(vencimientoHabilitacion).diff(pharmacyAndes.vencimientoHabilitacion, 'days');
        if (checkDisposicionFarmacia && checkMatricula && diferencia === 0) {
          const newUser = new User({ username, email, password, enrollment, cuil, businessName });
          newUser.roles.push(role);
          role.users.push(newUser);
          await newUser.save();
          await role.save();
          this.sendEmailNewUser(newUser);
          return res.status(200).json({
            newUser
          });
        }
      }
      return res.status(403).json('No se puede registrar el usuario');
    } catch (errors) {
      return res.status(422).json({ errors });
    }
  }

  public resetPassword = async (req: Request, res: Response): Promise<Response> => {
    const { _id } = req.user as IUser;
    const { oldPassword, newPassword } = req.body;
    try {
      const user: IUser | null = await User.findOne({ _id });
      if (!user) return res.status(404).json('No se ha encontrado el usuario');

      const isMatch: boolean = await User.schema.methods.isValidPassword(user, oldPassword);
      if (!isMatch) return res.status(401).json({ message: 'Su contraseña actual no coincide con nuestros registros' });

      // Actualizar contraseña y fechas de vencimiento
      const now = moment();

      await user.update({
        password: newPassword,
        passwordCreatedAt: now,
        authenticationToken: null,
        passwordChangeTokenExpiry: null
      });

      return res.status(200).json('Se ha modificado la contraseña correctamente!');
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  public recoverPassword = async (req: Request, res: Response): Promise<Response> => {
    const { authenticationToken, newPassword } = req.body;
    try {
      const errorMessage = "El link al que ha ingresado es inválido o ha expirado";
      const user: IUser | null = await User.findOne({ authenticationToken: authenticationToken });

      if (!user) return res.status(404).json({ message: errorMessage });

      if (!user || moment(user.passwordChangeTokenExpiry).isBefore(moment())) {
        return res.status(400).json({ message: errorMessage });
      }

      // Actualizar contraseña y fechas de vencimiento
      const now = moment();

      await user.update({
        password: newPassword,
        passwordCreatedAt: now,
        authenticationToken: null,
        passwordChangeTokenExpiry: null
      });

      return res.status(200).json('Se ha modificado la contraseña correctamente.');
    } catch (err) {
      console.log(err);
      return res.status(500).json('No es posible modificar la contraseña.');
    }
  }

  public login = async (req: Request, res: Response): Promise<Response> => {
    const { _id } = req.user as IUser;
    try {

      const user: IUser | null = await User.findOne({ _id }).populate({ path: 'roles', select: 'role' });

      if (user && user.isActive) {
        // Verificar si la contraseña está vencida
        const now = moment();
        const passwordExpired = user.passwordCreatedAt && moment(user.passwordCreatedAt).add(3, 'months').isBefore(moment());

        if (passwordExpired) {
          // Enviar correo de cambio de contraseña
          await this.sendPasswordExpiryNotification(user.username);

          return res.status(401).json({
            message: 'Su contraseña ha vencido. Se ha enviado un correo electrónico con instrucciones para cambiarla.',
            passwordExpired: true,
          });
        }

        const roles: string | string[] = [];
        await Promise.all(user.roles.map(async (role) => {
          roles.push(role.role);
        }));
        const token = this.signInToken(user._id, user.username, user.businessName, roles);
        const refreshToken = uuidv4();

        await User.updateOne({ _id: user._id }, { refreshToken: refreshToken, lastLogin: now });
        return res.status(200).json({
          jwt: token,
          refreshToken: refreshToken
        });
      }

      return res.status(httpCodes.EXPECTATION_FAILED).json('Debe iniciar sesión');
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  public logout = async (req: Request, res: Response): Promise<Response> => {
    const { refreshToken } = req.body;
    try {
      await User.findOneAndUpdate({ refreshToken: refreshToken }, { refreshToken: '' });
      return res.status(204).json('Logged out successfully!');
    } catch (err) {
      console.log(err);
      return res.status(500).json("Server error");
    }
  }

  public refresh = async (req: Request, res: Response): Promise<Response> => {
    const refreshToken = req.body.refreshToken;
    try {
      const user: IUser | null = await User.findOne({ refreshToken: refreshToken }).populate({ path: 'roles', select: 'role' });

      if (user) {
        // in next version, should embed roles information
        const roles: string | string[] = [];
        await Promise.all(user.roles.map(async (role) => {
          roles.push(role.role);
        }));

        const token = this.signInToken(user._id, user.username, user.businessName, roles);

        // generate a new refresh_token
        const refreshToken = uuidv4();
        await User.updateOne({ _id: user._id }, { refreshToken: refreshToken });
        return res.status(200).json({
          jwt: token,
          refreshToken: refreshToken
        });
      }

      return res.status(httpCodes.EXPECTATION_FAILED).json('Debe iniciar sesión');//in the case that not found user
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server error');
    }

  }

  public updateUser = async (req: Request, res: Response): Promise<Response> => {
    // "email", "password", "username", "enrollment", "cuil", "businessName",
    // son los campos que permitiremos actualizar.
    const { id } = req.params;
    const values: any = {};
    try {

      _(req.body).forEach((value: string, key: string) => {
        if (!_.isEmpty(value) && _.includes(["email", "password", "username", "enrollment", "cuil", "businessName"], key)) {
          values[key] = value;
        }
      });
      const opts: any = { runValidators: true, new: true, context: 'query' };
      const user: IUser | null = await User.findOneAndUpdate({ _id: id }, values, opts).select("username email cuil enrollment businessName");

      return res.status(200).json(user);
    } catch (e) {
      // formateamos los errores de validacion
      if (e.name !== 'undefined' && e.name === 'ValidationError') {
        let errors: { [key: string]: string } = {};
        Object.keys(e.errors).forEach(prop => {
          errors[prop] = e.errors[prop].message;
        });
        return res.status(422).json(errors);
      }
      console.log(e);
      return res.status(500).json("Server Error");
    }
  }

  public getUser = async (req: Request, res: Response): Promise<Response> => {
    // obtenemos los datos del usuario, buscando por: "email" / "username" / "cuil"
    const { email, username, cuil } = req.body;
    try {
      const users: IUser[] | null = await User.find({
        $or: [{ "email": email }, { "username": username }, { "cuil": cuil }]
      }).select("username email cuil enrollment, businessName");

      if (!users) return res.status(400).json('Usuario no encontrado');

      return res.status(200).json(users);
    } catch (err) {
      console.log(err);
      return res.status(500).json("Server Error");
    }
  }

  public assignRole = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { roleId } = req.body;
    try {
      const role: IRole | null = await Role.findOne({ _id: roleId });
      if (role) {
        await User.findByIdAndUpdate({ _id: id }, {
          roles: role
        });
      }
      const user: IUser | null = await User.findOne({ _id: id });
      return res.status(200).json(user);
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  /* modificar toke */
  public getToken = async (req: Request, res: Response): Promise<Response> => {
    const { username } = req.body;

    try {
      const user: IUser | null = await User.findOne({ username: username }).populate({ path: 'roles', select: 'role' });
      if (!user) {
        return res.status(422).json({ message: "Usuario no encontrado." });
      }
      // in next version, should embed roles information
      const roles: string | string[] = [];
      await Promise.all(user.roles.map(async (role) => {
        roles.push(role.role);
      }));

      const token = JWT.sign({
        iss: "recetar.andes",
        sub: user._id,
        usrn: user.username,
        bsname: user.businessName,
        rl: roles,
        iat: new Date().getTime()
      }, (process.env.JWT_SECRET || env.JWT_SECRET), {
        algorithm: 'HS256'
      });
      return res.status(200).json({ jwt: token });
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  private signInToken = (userId: string, username: string, businessName: string, role: string | string[]): any => {
    const now = moment().unix();
    const token = JWT.sign({
      iss: "recetar.andes",
      sub: userId,
      usrn: username,
      bsname: businessName,
      rl: role,
      iat: now,
      exp: now + moment.duration(env.TOKEN_LIFETIME, 'hours').asSeconds()
    }, (process.env.JWT_SECRET || env.JWT_SECRET), {
      algorithm: 'HS256'
    });
    return token;
  }

  /**
 * Envía un link para recuperar la contraseña en caso qeu sea un usuario temporal con email (fuera de onelogin).
 * AuthUser
 */
  public setValidationTokenAndNotify = async (username: string) => {
    try {
      let usuario: any = await User.findOne({ username });
      if (usuario) {
        usuario.authenticationToken = uuidv4();
        usuario.passwordChangeTokenExpiry = null;

        await usuario.save();

        const extras: any = {
          titulo: 'Recuperación de contraseña',
          usuario,
          nombre: usuario.businessName || usuario.username,
          url: `${process.env.APP_DOMAIN}/auth/recovery-password/${usuario.authenticationToken}`,
        };
        const htmlToSend = await renderHTML('emails/recover-password.html', extras);
        const options: MailOptions = {
          from: `${process.env.EMAIL_USERNAME}`,
          to: usuario.email.toString(),
          subject: 'Recuperación de contraseña',
          text: '',
          html: htmlToSend,
          attachments: null
        };

        await sendMail(options);
        return usuario;
      } else {
        return null;
      }
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  public sendPasswordExpiryNotification = async (username: string) => {
    try {
      let usuario: any = await User.findOne({ username });
      if (usuario) {
        // Generar token de cambio de contraseña con vencimiento de 24 horas
        const authenticationToken = uuidv4();
        const tokenExpiry = moment().endOf('day').add(72, 'hours').toDate();

        usuario.authenticationToken = authenticationToken;
        usuario.passwordChangeTokenExpiry = tokenExpiry;
        await usuario.save();

        const extras: any = {
          titulo: 'Contraseña Vencida - Cambio Requerido',
          nombre: usuario.businessName || usuario.username,
          url: `${process.env.APP_DOMAIN}/auth/recovery-password/${authenticationToken}`,
          expiryDate: moment(tokenExpiry).format('DD/MM/YYYY').toString()
        };

        const htmlToSend = await renderHTML('emails/password-expired.html', extras);
        const options: MailOptions = {
          from: `${process.env.EMAIL_USERNAME}`,
          to: usuario.email.toString(),
          subject: 'Contraseña Vencida - Cambio Requerido',
          text: 'Su contraseña ha vencido y debe ser cambiada. Por favor, haga clic en el enlace proporcionado para cambiar su contraseña.',
          html: htmlToSend,
          attachments: null
        };

        await sendMail(options);
        return usuario;
      } else {
        return null;
      }
    } catch (err) {
      console.log(err)
      throw err;
    }
  }

  public sendEmailNewUser = async (newUser: any) => {
    const extras: any = {
      titulo: 'Nuevo usuario',
      usuario: newUser,
      nombre: newUser.businessName || newUser.username,
      username: newUser.username,
    };
    const htmlToSend = await renderHTML('emails/new-user.html', extras);
    const options: MailOptions = {
      from: `${process.env.EMAIL_HOST}`,
      to: newUser.email.toString(),
      subject: 'Nuevo Usuario RecetAR',
      text: '',
      html: htmlToSend,
      attachments: null
    };
    await sendMail(options);
  }

  public getPharmacyAndes = async (req: Request, res: Response): Promise<Response> => {
    try {
      const cuil = req.query.cuil;
      const disposicionHabilitacion = req.query.disposicionHabilitacion;
      const resp = await needle('get', `${process.env.ANDES_ENDPOINT}/core/tm/farmacias?cuit=${cuil}&disposicionHabilitacion=${disposicionHabilitacion}`, { headers: { 'Authorization': process.env.JWT_MPI_TOKEN } });
      return res.status(200).json(resp.body);
    } catch (err) {
      return res.status(500).json('Server Error');
    }
  }

  private validateProfessional = (profesional: any, enrollment: string, cuil: string, graduationDate: string, enrollmentExpiration: string): boolean => {
    if (!profesional || !profesional.profesiones || profesional.profesiones.length === 0) {
      return false;
    }
    try {
      const lastProfesion = profesional.profesiones.find((p: any) => p.profesion.codigo == '1' || p.profesion.codigo == '23' || p.profesion.codigo == '2');
      const lastMatriculacion = lastProfesion && lastProfesion.matriculacion && lastProfesion.matriculacion.length ? lastProfesion.matriculacion[lastProfesion.matriculacion.length - 1] : null;
      if (lastMatriculacion) {
        let res = (moment(lastMatriculacion.fin) > moment());
        res = res && lastMatriculacion.matriculaNumero.toString() === enrollment;
        res = res && profesional.cuit === cuil;
        res = res && moment(lastMatriculacion.fin).format('DD-MM-YYYY') === enrollmentExpiration;
        res = res && moment(lastProfesion.fechaEgreso).format('DD-MM-YYYY') === graduationDate;
        return res;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  public getProfessionalsAndes = async (req: Request, res: Response): Promise<Response> => {
    try {
      const dni = req.query.documento;
      const enrollment = req.query.matricula;
      const cuil = req.query.cuil;
      const graduationDate = req.query.fechaEgreso;
      const enrollmentExpiration = req.query.fechaMatVencimiento;
      const resp = await needle('get', `${process.env.ANDES_ENDPOINT}/core/tm/profesionales/guia?documento=${dni}`);
      if (!resp.body || resp.body.length === 0) {
        return res.status(404).json({ message: 'No se encuentra el profesional.' });
      }
      if (!this.validateProfessional(resp.body[0], enrollment, cuil, graduationDate, enrollmentExpiration)) {
        return res.status(500).json({ message: 'No se encuentra el profesional.' });
      }
      return res.status(200).json(resp.body);
    } catch (err) {
      return res.status(500).json({ message: 'Server Error' });
    }
  }
}

export default new AuthController();
