import Patient from "../../models/patient.model";
import IPatient from "../../interfaces/patient.interface";

export class PatientClass {

    public getPatients = async (): Promise<IPatient[]> => {
        try {
            return await Patient.find();
        } catch (err) {
            throw new Error("OCURRIO UN ERROR AL OBTENER LOS PACIENTES: " + err);
        }
    }

    
}