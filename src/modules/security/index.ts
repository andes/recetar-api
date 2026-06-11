import { SecurityRepository } from './security.repository';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';

const repository = new SecurityRepository();
const service = new SecurityService(repository);
const controller = new SecurityController(service);

export { controller as securityController };
export { SecurityRepository, SecurityService, SecurityController };
