import { Router, Request, Response } from 'express';

import { hasPermissionIn } from '../middlewares/roles.middleware';
// interfaces
import { BaseController } from '../interfaces/classes/base-controllers.interface';

// controllers
// import roleController from '../controllers/role.controller';
import prescriptionController from '../controllers/prescription.controller';
import patientController from '../controllers/patient.controller';
// import pharmacistController from '../controllers/pharmacist.controller';
// import professionalController from '../controllers/professional.controller';
// import pharmacyController from '../controllers/pharmacy.controller';
import supplyController from '../controllers/supply.controller';
import authController from '../controllers/auth.controller';
import usersController from '../controllers/users.controller';
import snomedSupplyController from '../controllers/snomed.controller';
import andesPrescriptionController from '../controllers/andesPrescription.controller';
import certificateController from '../controllers/certificate.controller';
import practiceController from '../controllers/practice.controller';
class PrivateRoutes {

  constructor(private router: Router = Router()) { }

  public routes(): Router {
    // Auth
    this.router.get('/user/get-token', hasPermissionIn('readAny', 'user'), authController.getToken);
    this.router.get('/auth/user/find', hasPermissionIn('readAny', 'user'), authController.getUser);
    this.router.post('/auth/register', hasPermissionIn('updateAny', 'user'), authController.register);
    this.router.post('/auth/reset-password', authController.resetPassword);
    this.router.patch('/auth/user/:id', hasPermissionIn('updateAny', 'user'), authController.updateUser);

    // prescriptions
    this.router.get('/prescriptions', prescriptionController.getPrescriptionsDispensed);
    this.router.get(`/prescriptions/`, hasPermissionIn('readAny', 'prescription'), prescriptionController.index);
    this.router.get('/prescriptions/get-by-user-id/:userId', prescriptionController.getByUserId);
    this.router.get('/prescriptions/find/:patient_id&:date?', prescriptionController.getPrescriptionsByDateOrPatientId);
    this.router.get(`/prescriptions/:id`, hasPermissionIn('readAny', 'prescription'), prescriptionController.show);
    this.router.post(`/prescriptions/`, hasPermissionIn('createAny', 'prescription'), prescriptionController.create);
    this.router.post(`/prescriptions/get-csv/`, hasPermissionIn('readAny', 'prescription'), prescriptionController.getCsv);
    this.router.patch(`/prescriptions/:id/dispense`, hasPermissionIn('updateAny', 'prescription'), prescriptionController.dispense);
    this.router.patch(`/prescriptions/:id/cancel-dispense`, hasPermissionIn('updateAny', 'prescription'), prescriptionController.cancelDispense);
    this.router.patch(`/prescriptions/:id`, hasPermissionIn('updateOwn', 'prescription'), prescriptionController.update);
    this.router.delete(`/prescriptions/:id`, hasPermissionIn('deleteAny', 'prescription'), prescriptionController.delete);

    // certificate
    this.router.get(`/certificates/`, certificateController.index);
    this.router.get('/certificates/get-by-user-id/:userId', certificateController.getByUserId);
    this.router.post(`/certificates/`, certificateController.create);

    // prescriptions
    this.router.get('/prescriptions', prescriptionController.getPrescriptionsDispensed);
    this.router.get(`/prescriptions/`, hasPermissionIn('readAny', 'prescription'), prescriptionController.index);
    this.router.get('/prescriptions/get-by-user-id/:userId', prescriptionController.getByUserId);
    this.router.get('/prescriptions/find/:patient_id&:date?', prescriptionController.getPrescriptionsByDateOrPatientId);
    this.router.get(`/prescriptions/:id`, hasPermissionIn('readAny', 'prescription'), prescriptionController.show);
    this.router.post(`/prescriptions/`, hasPermissionIn('createAny', 'prescription'), prescriptionController.create);
    this.router.post(`/prescriptions/get-csv/`, hasPermissionIn('readAny', 'prescription'), prescriptionController.getCsv);
    this.router.patch(`/prescriptions/:id/dispense`, hasPermissionIn('updateAny', 'prescription'), prescriptionController.dispense);
    this.router.patch(`/prescriptions/:id/cancel-dispense`, hasPermissionIn('updateAny', 'prescription'), prescriptionController.cancelDispense);
    this.router.patch(`/prescriptions/:id`, hasPermissionIn('updateOwn', 'prescription'), prescriptionController.update);
    this.router.delete(`/prescriptions/:id`, hasPermissionIn('deleteAny', 'prescription'), prescriptionController.delete);

    // practices
    this.router.post('/practices', hasPermissionIn('createAny', 'prescription'), practiceController.create);

    // certificate
    this.router.get(`/certificates/`, certificateController.index);
    this.router.get(`/certificates/:id`, certificateController.getById);
    this.router.get('/certificates/get-by-user-id/:userId', certificateController.getByUserId);
    this.router.post(`/certificates/`, certificateController.create);

    // patients
    this.router.get(`/patients/`, hasPermissionIn('readAny', 'patient'), patientController.index);
    this.router.get('/patients/get-os', patientController.getObrasSociales);
    this.router.get('/patients/get-os-by-dni', patientController.getObraSocial);
    this.router.get(`/patients/:id`, hasPermissionIn('readAny', 'patient'), patientController.show);
    // this.router.get('/patients/get-os-by-dni/', patientController.getObraSocial);
    // this.router.get('/patients/get-os/', patientController.getObrasSociales);
    this.router.get('/patients/get-by-dni/:dni', patientController.getByDni);
    this.router.post(`/patients/`, hasPermissionIn('createAny', 'patient'), patientController.create);
    this.router.put(`/patients/:id`, hasPermissionIn('updateAny', 'patient'), patientController.update);
    this.router.patch('/patients/:id', hasPermissionIn('updateAny', 'patient'), patientController.updatePatient);
    // this.router.delete(`/patients/:id`, hasPermissionIn('deleteAny','patient'), patientController.delete);

    // supply
    this.router.get(`/supplies/`, hasPermissionIn('readAny', 'supplies'), supplyController.index);
    this.router.get('/supplies', supplyController.get);
    this.router.get('/supplies/get-by-name', supplyController.getByName);
    this.router.post(`/supplies/`, hasPermissionIn('createAny', 'supplies'), supplyController.create);
    this.router.patch('/supplies/:id', hasPermissionIn('updateAny', 'supplies'), supplyController.update);
    // this.router.get(`/supplies/:id`, hasPermissionIn('readAny','patient'), supplyController.show);
    // this.router.put(`/supplies/:id`, hasPermissionIn('updateAny','patient'), supplyController.update);
    // this.router.delete(`/supplies/:id`, hasPermissionIn('deleteAny','patient'), supplyController.delete);

    // SNOMED
    this.router.get('/snomed/supplies/', hasPermissionIn('readAny', 'supplies'), snomedSupplyController.index);

    // Andes prescriptions
    this.router.get('/andes-prescriptions/from-andes/', hasPermissionIn('readAny', 'prescription'), andesPrescriptionController.getFromAndes);
    this.router.get('/andes-prescriptions/:id', hasPermissionIn('readAny', 'prescription'), andesPrescriptionController.show);
    this.router.patch('/andes-prescriptions/dispense', hasPermissionIn('updateAny', 'prescription'), andesPrescriptionController.dispense);

    // Users
    this.router.get('/users/index', hasPermissionIn('readAny', 'user'), usersController.index);
    this.router.post('/users/update', hasPermissionIn('updateAny', 'user'), usersController.update);

    // pharmacy
    // this.router.get(`/pharmacies/`, hasPermissionIn('readAny','patient'), pharmacyController.index);
    // this.router.post(`/pharmacies/`, hasPermissionIn('createAny','patient'), pharmacyController.create);
    // this.router.get(`/pharmacies/:id`, hasPermissionIn('readAny','patient'), pharmacyController.show);
    // this.router.put(`/pharmacies/:id`, hasPermissionIn('updateAny','patient'), pharmacyController.update);
    // this.router.delete(`/pharmacies/:id`, hasPermissionIn('deleteAny','patient'), pharmacyController.delete);


    // test route: only requires authentication
    // this.router.get('/test', (req: Request, res: Response): Response => {
    //   return res.status(200).json('test OK!');
    // });

    // this.router.post('/users/:id/assign-role', authController.assignRole);

    // pharmacistRoleMiddleware, professionalRoleMiddleware 2 middlewares, para determinar a que routa tiene accesos el farmaceutico y/o profesional
    // ejemplo:
    // this.router.post('/test', passportMiddlewareJwt, pharmacistRoleMiddleware, testController.tmp);

    // this.router.post('/roles/:id/assign-user', roleController.assignUser)

    // roles
    // this.router.get(`/roles/`, hasPermissionIn('readAny','role'), roleController.index);
    // this.router.post(`/roles/`, hasPermissionIn('createAny','role'), roleController.create);
    // this.router.get(`/roles/:id`, hasPermissionIn('readAny','role'), roleController.show);
    // this.router.put(`/roles/:id`, hasPermissionIn('updateAny','role'), roleController.update);
    // this.router.delete(`/roles/:id`, hasPermissionIn('deleteAny','role'), roleController.delete);

    // pharmacist
    // this.router.get(`/pharmacists/`, hasPermissionIn('readAny','patient'), pharmacistController.index);
    // this.router.post(`/pharmacists/`, hasPermissionIn('createAny','patient'), pharmacistController.create);
    // this.router.get(`/pharmacists/:id`, hasPermissionIn('readAny','patient'), pharmacistController.show);
    // this.router.put(`/pharmacists/:id`, hasPermissionIn('updateAny','patient'), pharmacistController.update);
    // this.router.delete(`/pharmacists/:id`, hasPermissionIn('deleteAny','patient'), pharmacistController.delete);

    // professional
    // this.router.get(`/professionals/`, hasPermissionIn('readAny','patient'), professionalController.index);
    // this.router.post(`/professionals/`, hasPermissionIn('createAny','patient'), professionalController.create);
    // this.router.get(`/professionals/:id`, hasPermissionIn('readAny','patient'), professionalController.show);
    // this.router.put(`/professionals/:id`, hasPermissionIn('updateAny','patient'), professionalController.update);
    // this.router.delete(`/professionals/:id`, hasPermissionIn('deleteAny','patient'), professionalController.delete);

    return this.router;
  }
}

const privateRoutes: PrivateRoutes = new PrivateRoutes();
export default privateRoutes.routes();
