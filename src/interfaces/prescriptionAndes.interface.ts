import { ObjectId, ObjectID } from "mongodb";
import { Document } from "mongoose";

export default interface IPrescriptionAndes extends Document {
    id: ObjectID;
    organizacion: {
        id: ObjectID;
        nombre: String;
    }
    profesional: {
        id: ObjectId;
        nombre: String;
        apellido: String;
        documento: String;
        profesion: String;
        especialidad: String;
        matricula: Number;
    }
    diagnostico: {
        term: String;
        fsn: String;
        conceptId: String;
        semanticTag: String;
    }
    fechaResgistro: Date;
    fechaPrestacion: Date;
    idPrestacion: String;
    idRegistro: String;
    medicamento: {
        concepto: {
            conceptId: String;
            term: String;
            fsn: String;
            semanticTag: String;
        }
        dosisDiaria: {
            dosis: String;
            instervalo: {
                id: ObjectID;
                key: String;
                nombre: String;
                source: String;
                type: String;
            }
            dias: Number;
            notaMedica: String;
        }
        presentacion: String;
        unidades: String;
        cantidad: Number;
        cantEnvases: Number;
        tratamientoProlongado: Boolean;
        tiempoTratamiento: any;
    }
    dispensa: [
        {
            codigo: String;
            descripcion: String;
            cantidad: Number;
            organizacion: {
                id: ObjectID;
                nombre: String;
            }
        }
    ]
    estados: [
        {
            id: ObjectID;
            tipo: 'vigente' | 'finalizada' | 'vencida' | 'suspendida' | 'rechazada';
            createdAt: Date;
            createdBy: {
                nombre: String;
                apellido: String;
                organizacion: {
                    nombre: String;
                }
            }
        }
    ]
    estadosDispensa: [
        {
            id: ObjectID;
            tipo: 'sin dispensa' | 'dispensada' | 'dispensa-parcial';
            fecha: Date;
            sistema?: 'sifaho' | 'recetar';
        }
    ]
    appNotificada: [
        {
            id: ObjectID
            fecha: Date
        }
    ]
    estadoActual: {
        id: ObjectId;
        tipo: String;
        createdAt: Date;
        createdBy: {
            nombre: String;
            apellido: String;
            organizacion: {
                nombre: String;
            }
        }

    };
    estadoDispensaActual: {
        tipo: String;
        fecha: Date;
        id: ObjectID;
    }
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
        }
        genero: String;
        nombreCompleto: String,
        edad: Number;
        edadReal: {
            valor: Number;
            unidad: String;
        }
    }
    createdAt: Date;
    createdBy: {
        nombre: String;
        apellido: String;
        organizacion: {
            nombre: String;
        }
    }
    updatedAt: Date;
    updatedBy: {
        nombre: String;
        apellido: String;
        organizacion: {
            nombre: String;
        }
    }
}