const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno del API
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_CONNECTION || 'mongodb://localhost/recetar';

const supplySchema = new mongoose.Schema({
    name: { type: String, required: true },
    activePrinciple: String,
    snomedConcept: {
        conceptId: String,
        term: String,
        fsn: String,
        semanticTag: String
    }
}, { timestamps: true });

const Supply = mongoose.model('Supply', supplySchema);

async function seed() {
    try {
        console.log('CONECTANDO A:', MONGODB_URI);
        await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('CONECTADO A MONGO');

        const existing = await Supply.findOne({ name: 'Paracetamol 500mg' });
        if (existing) {
            console.log('EL MEDICAMENTO YA EXISTE');
        } else {
            const newSupply = new Supply({
                name: 'Paracetamol 500mg',
                activePrinciple: 'Paracetamol',
                snomedConcept: {
                    conceptId: '1000001',
                    term: 'Paracetamol 500mg',
                    fsn: 'Paracetamol 500mg',
                    semanticTag: 'producto'
                }
            });
            await newSupply.save();
            console.log('MEDICAMENTO SEMBRADO EXITOSAMENTE');
        }

        process.exit(0);
    } catch (err) {
        console.error('ERROR AL SEMBRAR:', err);
        process.exit(1);
    }
}

seed();
