import { Document } from 'mongoose';

export default interface IProfesionAutorizada extends Document {
    profesion: string;
    codigoProfesion: string;
}