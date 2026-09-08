import { Schema, Model, model, SchemaTypes } from 'mongoose';
import IPrescriptionAndes from '../interfaces/prescriptionAndes.interface';
import { generarIdSecuencial } from './prescription.model';


const sistemaSchema = {
    type: String,
    enum: ['sifaho', 'recetar']
};

const cancelarSchema = new Schema({
    idDispensaApp: {
        type: String,
        required: false
    },
    motivo: {
        type: String,
        required: false
    },
    organizacion: {
        id: String,
        nombre: String
    }
});

const ProfesionalSubSchema = new Schema({
    id: SchemaTypes.ObjectId,
    nombre: String,
    apellido: String,
    documento: String
}, { _id: false });

const estadosSchema = new Schema({
    tipo: {
        type: String,
        enum: ['pendiente', 'vigente', 'finalizada', 'vencida', 'suspendida', 'rechazada'],
        required: true,
        default: 'vigente'
    },
    motivo: {
        type: String,
        required: false
    },
    observacion: {
        type: String,
        required: false
    },
    profesional: {
        type: ProfesionalSubSchema,
        required: false
    },
    organizacionExterna: {
        id: {
            type: String,
            required: false
        },
        nombre: {
            type: String,
            required: false
        }
    }
});

const estadoDispensaSchema = new Schema({
    tipo: {
        type: String,
        enum: ['sin-dispensa', 'dispensada', 'dispensa-parcial'],
        required: true
    },
    idDispensaApp: {
        type: String,
        required: false
    },
    fecha: Date,
    sistema: sistemaSchema,
    cancelada: {
        type: cancelarSchema,
        required: false
    }
});

// Schema
const prescriptionAndesSchema = new Schema({
    idReceta: {
        type: String,
        unique: true,
        sparse: true
    },
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
        esMagistral: { type: Boolean, default: false },
        magistral: {
            codigo: [
                {
                    fuente: String,
                    valor: String
                }
            ],
            nombre: String,
            unidadMedida: String,
            id: Schema.Types.ObjectId
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
            descripcion: String,
            cantidad: Number,
            organizacion: {
                id: Schema.Types.ObjectId,
                nombre: String
            }
        }
    ],
    estados: [estadosSchema],
    estadoActual: estadosSchema,
    appNotificada: [
        {
            id: Schema.Types.ObjectId,
            fecha: Date
        }
    ],
    estadosDispensa: [estadoDispensaSchema],
    estadoDispensaActual: estadoDispensaSchema,
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
            prepaga: Boolean,
            numeroAfiliado: String
        },
        genero: String,
        nombreCompleto: String,
        edad: Number,
        edadReal: {
            valor: Number,
            unidad: String
        },
        cuil: String
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

prescriptionAndesSchema.post('save', async (prescription: IPrescriptionAndes) => {
    if (!prescription.idReceta) {
        const id = await generarIdSecuencial(prescription.createdAt || new Date(), 0);
        await PrescriptionAndes.updateOne({ _id: prescription._id }, { $set: { idReceta: id } });
    }
});

// Model
const PrescriptionAndes: Model<IPrescriptionAndes> = model<IPrescriptionAndes>('PrescriptionAndes', prescriptionAndesSchema);

export default PrescriptionAndes;
