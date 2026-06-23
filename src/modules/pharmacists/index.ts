import { PharmacistRepository } from './pharmacists.repository';
import { PharmacistService } from './pharmacists.service';
import { PharmacistController } from './pharmacists.controller';
import { createLogger } from '@andes/log';

const logger = createLogger('pharmacists');

const repository = new PharmacistRepository();
const service = new PharmacistService(repository, logger);
const controller = new PharmacistController(service);

export { controller as pharmacistController };
export { PharmacistController, PharmacistService, PharmacistRepository };
