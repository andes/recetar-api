import { Router } from 'express';
import certificateController from '../controllers/certificate.controller';

class PublicRoutes{

  constructor(private router: Router = Router()){}
  public routes(): Router{
    this.router.get('/certificates/:id', certificateController.getById);
    return this.router;
  }
}

const publicRoutes: PublicRoutes = new PublicRoutes();
export default publicRoutes.routes();
