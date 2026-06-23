import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { createLogger } from '@andes/log';

const logger = createLogger('auth');

const repository = new AuthRepository();
const service = new AuthService(repository, logger);
const controller = new AuthController(service);

export { controller as authController };
export { AuthController, AuthService, AuthRepository };
export type {
    LoginDTO,
    RegisterDTO,
    RefreshDTO,
    ResetPasswordDTO,
    RecoverPasswordDTO,
    GetTokenDTO,
} from './auth.dto';
