import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AndesClient } from '../../integrations/andes';
import { createProfessionalService } from '../professionals';
import { devLogger } from '../../shared/logger/dev-logger';
import { env } from '../../config/config';

const repository = new AuthRepository();
const andesClient = new AndesClient({
    andesEndpoint: env.ANDES_ENDPOINT,
    jwtMpiToken: env.JWT_MPI_TOKEN,
    mpiEndpoint: env.ANDES_MPI_ENDPOINT,
});
const professionalProfileService = createProfessionalService(andesClient, devLogger);
const service = new AuthService(repository, devLogger, undefined, undefined, andesClient, professionalProfileService);
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
