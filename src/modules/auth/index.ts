import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

const repository = new AuthRepository();
const service = new AuthService(repository, logger as any);
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
