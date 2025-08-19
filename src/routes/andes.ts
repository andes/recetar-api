import { Router } from 'express';
import andesController from '../controllers/andesPrescription.controller';
import practiceController from '../controllers/practice.controller';
import { checkAuthAndes } from '../middlewares/passport-config-andes.middleware';


class AndesRoutes{

  constructor(private router: Router = Router()){}

  // deefine your public routes inside of routes function
  public routes(): Router{

    // Rutas de prescripciones
    this.router.post('/prescriptions', checkAuthAndes, andesController.create);

    // Rutas de prácticas médicas
    this.router.post('/practices', checkAuthAndes, practiceController.create);

    return this.router;
  }
}

const andesRoutes: AndesRoutes = new AndesRoutes();
export default andesRoutes.routes();
