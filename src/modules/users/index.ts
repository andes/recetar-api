import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AndesClient } from '../../integrations/andes';
import { env } from '../../config/config';

const repository = new UsersRepository();
const andesClient = new AndesClient({
    andesEndpoint: env.ANDES_ENDPOINT,
    jwtMpiToken: env.JWT_MPI_TOKEN,
    mpiEndpoint: env.ANDES_MPI_ENDPOINT,
});
const service = new UsersService(repository, andesClient);
const controller = new UsersController(service);

export { controller as usersController };
export { UsersRepository, UsersService, UsersController };
export type { ListUsersDTO, CreateUserDTO, UpdateUserDTO } from './users.dto';
