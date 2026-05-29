import Patient from './patients.model';
import { IPatient } from './patients.types';

export class PatientRepository {
    async findAll(): Promise<IPatient[]> {
        return Patient.find().exec();
    }

    async findById(id: string): Promise<IPatient | null> {
        return Patient.findById(id).exec();
    }

    async findByDni(dni: string): Promise<IPatient[]> {
        return Patient.find({ dni }).exec();
    }

    async findOneByDniAndSex(dni: string, sex: string): Promise<IPatient | null> {
        return Patient.findOne({ dni, sex }).exec();
    }

    async create(data: Partial<IPatient>): Promise<IPatient> {
        return Patient.create(data);
    }

    async update(id: string, data: Partial<IPatient>): Promise<IPatient | null> {
        return Patient.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec() as unknown as IPatient | null;
    }

    async updatePartial(id: string, values: Record<string, unknown>): Promise<IPatient | null> {
        const opts = { runValidators: true, new: true, context: 'query' };
        await Patient.updateOne({ _id: id }, values, opts).exec();
        return Patient.findById(id).select('dni lastName firstName sex').exec();
    }

    async save(patient: IPatient): Promise<IPatient> {
        return patient.save();
    }
}
