import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AndesClient, SisaClient } from '../../integrations';
import { env } from '../../config/config';

const repository = new UsersRepository();
const andesClient = new AndesClient({
    andesEndpoint: env.ANDES_ENDPOINT,
    jwtMpiToken: env.JWT_MPI_TOKEN,
    mpiEndpoint: env.ANDES_MPI_ENDPOINT,
});
const sisaClient = new SisaClient({
    url: env.SISA_URL,
    username: env.SISA_USERNAME,
    password: env.SISA_PASSWORD,
    provincia: env.SISA_PROVINCIA,
});
const service = new UsersService(repository, andesClient, sisaClient);
const controller = new UsersController(service);

export { controller as usersController };
export { UsersRepository, UsersService, UsersController };
export type { ListUsersDTO, CreateUserDTO, UpdateUserDTO } from './users.dto';
