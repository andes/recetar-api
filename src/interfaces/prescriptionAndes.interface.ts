import { ObjectId, ObjectID } from 'mongodb';
import { Document } from 'mongoose';
import { ISnomedConcept } from './supply.interface';

export interface IDispensa extends Document {
    descripcion: String;
    cantidad: Number;
    medicamento: ISnomedConcept;
    presentacion: String;
    unidades: String;
    cantidadEnvases: Number;
    organizacion: {
        id: ObjectID;
        nombre: String;
    };
}
export default interface IPrescriptionAndes extends Document {
    idAndes: ObjectID;
    organizacion: {
        id: ObjectID;
        nombre: String;
    };
    profesional: {
        id: ObjectId;
        nombre: String;
        apellido: String;
        documento: String;
        profesion: String;
        especialidad: String;
        matricula: Number;
        efector?: {
            _id: ObjectID;
            nombre: String;
            direccion: String;
        };
    };
    diagnostico: {
        term: String;
        fsn: String;
        conceptId: String;
        semanticTag: String;
    };
    fechaRegistro: Date;
    fechaPrestacion: Date;
    idPrestacion: String;
    idRegistro: String;
    medicamento: {
        concepto: ISnomedConcept;
        dosisDiaria: {
            dosis: String;
            instervalo: {
                id: ObjectID;
                key: String;
                nombre: String;
                source: String;
                type: String;
            };
            dias: Number;
            notaMedica: String;
        };
        presentacion: String;
        unidades: String;
        cantidad: Number;
        cantEnvases: Number;
        tratamientoProlongado: Boolean;
        tiempoTratamiento: any;
    };
    dispensa: IDispensa[];
    estados: [
        {
            id?: ObjectID;
            tipo: 'pendiente' | 'vigente' | 'finalizada' | 'vencida' | 'suspendida' | 'rechazada';
            createdAt: Date;
            createdBy: {
                nombre: String;
                apellido: String;
                organizacion: {
                    nombre: String;
                };
            };
        }
    ];
    estadosDispensa: [
        {
            id?: ObjectID;
            tipo: 'sin dispensa' | 'dispensada' | 'dispensa-parcial';
            fecha: Date;
            sistema?: 'sifaho' | 'recetar';
            cancelada: {
                type: {
                    idDispensaApp: {
                        type: String;
                        required: false;
                    };
                    motivo: {
                        type: String;
                        required: false;
                    };
                    organizacion: {
                        id: String;
                        nombre: String;
                    };
                };
                required: false;
            };
        }
    ];
    appNotificada: [
        {
            id: ObjectID;
            fecha: Date;
        }
    ];
    estadoActual: {
        id?: ObjectId;
        tipo: 'pendiente' | 'vigente' | 'finalizada' | 'vencida' | 'suspendida' | 'rechazada';
        createdAt: Date;
        createdBy: {
            nombre: String;
            apellido: String;
            organizacion: {
                nombre: String;
            };
        };

    };
    estadoDispensaActual: {
        tipo: 'sin-dispensa' | 'dispensada' | 'dispensa-parcial';
        fecha: Date;
        id?: ObjectID;
    };
    paciente: {
        carpetaEfectores: [];
        id: ObjectID;
        nombre: String;
        apellido: String;
        documento: String;
        sexo: String;
        fechaNacimiento: Date;
        obraSocial: {
            codigoPuco: Number;
            nombre: String;
            financiador: String;
            origen: String;
            fechaActualizacion: Date;
            prepaga: Boolean;
        };
        genero: String;
        nombreCompleto: String;
        edad: Number;
        edadReal: {
            valor: Number;
            unidad: String;
        };
        cuil: String;
    };
    createdAt: Date;
    createdBy: {
        nombre: String;
        apellido: String;
        organizacion: {
            nombre: String;
        };
    };
    updatedAt: Date;
    updatedBy: {
        nombre: String;
        apellido: String;
        organizacion: {
            nombre: String;
        };
    };
}
