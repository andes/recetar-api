import { Router } from 'express';
import certificateController from '../controllers/certificate.controller';
import practiceController from '../controllers/practice.controller';

class PublicRoutes{

  constructor(private router: Router = Router()){}
  public routes(): Router{
    this.router.get('/certificates/:id', certificateController.getById);
        this.router.get('/practices/:id', practiceController.getById);

    return this.router;
  }
}

const publicRoutes: PublicRoutes = new PublicRoutes();
export default publicRoutes.routes();
