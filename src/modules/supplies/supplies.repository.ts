import Supply from './supplies.model';
import { ISupply } from './supplies.types';

export class SupplyRepository {
    async findAll(skip = 0, limit = 20): Promise<ISupply[]> {
        return Supply.find().skip(skip).limit(limit).exec();
    }

    async findById(id: string): Promise<ISupply | null> {
        return Supply.findById(id).exec();
    }

    async findByName(name: string): Promise<ISupply[]> {
        return Supply.find({ name: { $regex: name, $options: 'i' } }).limit(20).exec();
    }

    async create(data: Partial<ISupply>): Promise<ISupply> {
        return Supply.create(data);
    }

    async update(id: string, data: Partial<ISupply>): Promise<ISupply | null> {
        return Supply.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
    }

    async delete(id: string): Promise<ISupply | null> {
        return Supply.findByIdAndDelete(id).exec();
    }
}
