import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AndesClient } from '../../integrations/andes';
import { createLogger } from '@andes/log';
import { env } from '../../config/config';

const logger = createLogger('auth');

const repository = new AuthRepository();
const andesClient = new AndesClient({
    andesEndpoint: env.ANDES_ENDPOINT,
    jwtMpiToken: env.JWT_MPI_TOKEN,
    mpiEndpoint: env.ANDES_MPI_ENDPOINT,
});
const service = new AuthService(repository, logger, undefined, undefined, andesClient);
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
