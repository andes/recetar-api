import Pharmacist from './pharmacists.model';
import Pharmacy from './pharmacy.model';
import { IPharmacist, IPharmacy } from './pharmacists.types';

export class PharmacistRepository {
    async findAll(): Promise<IPharmacist[]> {
        return Pharmacist.find().exec();
    }

    async findById(id: string): Promise<IPharmacist | null> {
        return Pharmacist.findById(id).exec();
    }

    async findByEnrollment(enrollment: string): Promise<IPharmacist | null> {
        return Pharmacist.findOne({ enrollment }).exec();
    }

    async create(data: Partial<IPharmacist>): Promise<IPharmacist> {
        return Pharmacist.create(data);
    }

    async update(id: string, data: Partial<IPharmacist>): Promise<IPharmacist | null> {
        return Pharmacist.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec() as unknown as IPharmacist | null;
    }

    async delete(id: string): Promise<IPharmacist | null> {
        return Pharmacist.findByIdAndDelete(id).exec();
    }

    async findAllPharmacies(): Promise<IPharmacy[]> {
        return Pharmacy.find().populate('pharmacist').exec();
    }

    async findPharmacyById(id: string): Promise<IPharmacy | null> {
        return Pharmacy.findById(id).populate('pharmacist').exec();
    }

    async findPharmacyByCuit(cuit: string): Promise<IPharmacy | null> {
        return Pharmacy.findOne({ cuit }).populate('pharmacist').exec();
    }

    async createPharmacy(data: Partial<IPharmacy>): Promise<IPharmacy> {
        return Pharmacy.create(data);
    }

    async updatePharmacy(id: string, data: Partial<IPharmacy>): Promise<IPharmacy | null> {
        return Pharmacy.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec() as unknown as IPharmacy | null;
    }

    async deletePharmacy(id: string): Promise<IPharmacy | null> {
        return Pharmacy.findByIdAndDelete(id).exec();
    }
}
