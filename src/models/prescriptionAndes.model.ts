import { Schema, Model, model } from 'mongoose';
import IPrescriptionAndes from '../interfaces/prescriptionAndes.interface';
import { ObjectID } from 'mongodb';


// Schema
const prescriptionAndesSchema = new Schema({
    id: Schema.Types.ObjectId,
    organizacion: {
        id: Schema.Types.ObjectId,
        nombre: String
    },
    profesional: {
        id: Schema.Types.ObjectId,
        nombre: String,
        apellido: String,
        documento: String,
        profesion: String,
        especialidad: String,
        matricula: Number
    },
    diagnostico: {
        term: String,
        fsn: String,
        conceptId: String,
        semanticTag: String
    },
    fechaRegistro: Date,
    fechaPrestacion: Date,
    idRegistro: String,
    medicamento: {
        concepto: {
            conceptId: String,
            term: String,
            fsn: String,
            semanticTag: String
        },
        dosisDiaria: {
            dosis: String,
            intervalo: {
                id: Schema.Types.ObjectId,
                key: String,
                nombre: String,
                source: String,
                type: String
            },
            dias: Number,
            notaMedica: String,
        },
        presentacion: String,
        unidades: String,
        cantidad: Number,
        cantEnvases: Number,
        tratamientoProlongado: Boolean,
        tiempoTratamiento: Schema.Types.Mixed,
    },
    dispensa: [
        {
            codigo: String,
            descripcion: String,
            cantidad: Number,
            organizacion: {
                id: Schema.Types.ObjectId,
                nombre: String
            }
        }
    ],
    estados: [
        {   
            id: Schema.Types.ObjectId,
            tipo: {
                type: String,
                enum: ['vigente', 'finalizada', 'vencida', 'suspendida', 'rechazada'],
                required: true
            },
            createdAt: Date,
            createdBy: {
                nombre: String,
                apellido: String,
                organizacion: {
                    nombre: String
                }
            }
        }
    ],
    estadosDispensa: [
        {
            id: Schema.Types.ObjectId,
            tipo: {
                type: String,
                enum: ['sin dispensa', 'dispensada', 'dispensa-parcial'],
                required: true
            },
            fecha: Date,
            sistema: {
                type: String,
                enum: ['sifaho', 'recetar']
            }
        }
    ],
    appNotificada: [
        {
            id: Schema.Types.ObjectId,
            fecha: Date
        }
    ],
    estadoActual: {
        id: Schema.Types.ObjectId,
        tipo: {
            type: String,
            enum: ['vigente', 'finalizada', 'vencida', 'suspendida', 'rechazada']
        },
        createdAt: Date,
        createdBy: {
            nombre: String,
            apellido: String,
            organizacion: {
                nombre: String
            }
        }
    },
    estadoDispensaActual: {
        tipo: {
            type: String,
            enum: ['sin dispensa', 'dispensada', 'dispensa-parcial']
        },
        fecha: Date,
        id: Schema.Types.ObjectId 
    },
    paciente: {
        carpetaEfectores: [],
        id: Schema.Types.ObjectId,
        nombre: String,
        apellido: String,
        documento: String,
        sexo: String,
        fechaNacimiento: Date,
        obraSocial: {
            codigoPuco: Number,
            nombre: String,
            financiador: String,
            origen: String,
            fechaActualizacion: Date,
            prepaga: Boolean
        },
        genero: String,
        nombreCompleto: String,
        edad: Number,
        edadReal: {
            valor: Number,
            unidad: String
        }
    },
    createdAt: Date,
    createdBy: {
        nombre: String,
        apellido: String,
        organizacion: {
            nombre: String
        }
    },
    updatedAt: Date,
    updatedBy: {
        nombre: String,
        apellido: String,
        organizacion: {
            nombre: String
        }
    }
});

// Model
const PrescriptionAndes: Model<IPrescriptionAndes> = model<IPrescriptionAndes>('PrescriptionAndes', prescriptionAndesSchema);

export default PrescriptionAndes;
