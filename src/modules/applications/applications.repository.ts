import Application from './applications.model';
import { IApplication } from './applications.types';

export class ApplicationRepository {
    async create(data: Partial<IApplication>): Promise<IApplication> {
        return Application.create(data);
    }

    async findById(id: string): Promise<IApplication | null> {
        return Application.findById(id).exec();
    }

    async findByName(nombre: string): Promise<IApplication | null> {
        return Application.findOne({ nombre }).exec();
    }

    async updateToken(id: string, token: string): Promise<IApplication | null> {
        return Application.findByIdAndUpdate(id, { $set: { token } }, { new: true }).exec();
    }

    async updateActive(id: string, activo: boolean): Promise<IApplication | null> {
        return Application.findByIdAndUpdate(id, { $set: { activo } }, { new: true }).exec();
    }

    async update(id: string, data: Partial<IApplication>): Promise<IApplication | null> {
        return Application.findByIdAndUpdate(id, data, { new: true }).exec();
    }

    async delete(id: string): Promise<IApplication | null> {
        return Application.findByIdAndDelete(id).exec();
    }
}
