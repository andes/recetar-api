import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app-test-helper';
import Prescription from '../../../src/models/prescription.model';
import User from '../../../src/models/user.model';
import Patient from '../../../src/models/patient.model';
import Supply from '../../../src/models/supply.model';
import { env } from '../../../src/config/config';

// Mock dependencies
jest.mock('../../../src/middlewares/passport-config.middleware', () => ({
    checkAuth: (req: any, res: any, next: any) => next(),
}));

jest.mock('../../../src/middlewares/roles.middleware', () => ({
    hasPermissionIn: () => (req: any, res: any, next: any) => next(),
}));

jest.mock('../../../src/routes/auth', () => {
    const express = require('express');
    const router = express.Router();
    // Return a dummy router for auth routes so we don't need to load the actual auth controller and needle/etc
    return router;
});

// Mock ANDES communication
jest.mock('needle');
jest.mock('axios', () => ({
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn()
}));

import needle from 'needle';
import axios from 'axios';

// Remove duplicate default implementation since we did it above in jest.mock

describe('Prescription Creation Integration Tests', () => {
    let app: any;
    let testProfessional: any;
    let testPatientData: any;
    let testSupply: any;

    beforeAll(async () => {
        app = createApp();

        // Create test data in the Testcontainers MongoDB
        testProfessional = await User.create({
            username: 'testdoc',
            email: 'doc@test.com',
            password: 'password123',
            businessName: 'Dr. Test Professional',
            cuil: '20123456789',
            enrollment: 'MN1234',
            sex: 'Masculino',
            idAndes: 'andes-id-123',
            profesionGrado: [{
                profesion: 'Médico',
                codigoProfesion: '1',
                numeroMatricula: 'MN1234'
            }]
        });

        testPatientData = {
            firstName: 'Test',
            lastName: 'Patient',
            sex: 'Femenino',
            dni: '12345678',
            idMPI: 'mpi-test-123',
            os: {
                nombre: 'TEST OS',
                codigoPuco: 123456
            }
        };

        testSupply = await Supply.create({
            name: 'Ibuprofeno 400mg',
            snomedConcept: '123456789',
            snomedTerm: 'Ibuprofeno (sustancia)',
            pharmaceuticalForm: 'Comprimido'
        });
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Patient.deleteMany({});
        await Supply.deleteMany({});
        await Prescription.deleteMany({});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    beforeEach(() => {
        (needle as any).mockImplementation(() => Promise.resolve({ statusCode: 200, body: [] }));

        (axios.post as jest.Mock).mockImplementation((url: string, data: any) => {
            if (url && url.includes('/modules/recetas')) {
                return Promise.resolve({ statusText: 'OK', status: 200 });
            }
            // For Andes MPI patient creation
            return Promise.resolve({
                status: 200,
                data: { id: 'new-mpi-test-123', documento: data?.documento, sexo: data?.sexo }
            });
        });

        (axios.get as jest.Mock).mockImplementation((url: string) => {
            return Promise.resolve({ status: 200, data: { identificadores: [] } });
        });

        (axios.patch as jest.Mock).mockImplementation((url: string) => {
            return Promise.resolve({ status: 200 });
        });
    });

    it('should create a prescription with ambito privado', async () => {
        const payload = {
            professional: testProfessional._id.toString(),
            patient: testPatientData,
            date: new Date().toISOString(),
            ambito: 'privado',
            trimestral: false,
            supplies: [{
                quantity: 1,
                quantityPresentation: 30,
                diagnostic: 'Dolor de cabeza',
                indication: 'Tomar 1 cada 8 horas',
                supply: testSupply
            }]
        };

        const res = await request(app)
            .post(`${env.API_URI_PREFIX}/prescriptions/`)
            .send(payload);

        expect(res.status).toBe(200);

        // Assert response
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(1);
        expect(res.body[0].status).toBe('Pendiente');
        expect(res.body[0].ambito).toBe('privado');

        // Assert database insertion
        const dbPrescription = await Prescription.findById(res.body[0]._id);
        expect(dbPrescription).not.toBeNull();
        expect(dbPrescription?.ambito).toBe('privado');
        expect(dbPrescription?.patient.dni).toBe(testPatientData.dni);
        expect(dbPrescription?.supplies[0].supply.name).toBe(testSupply.name);
    });

    it('should create a prescription with ambito publico', async () => {
        const payload = {
            professional: testProfessional._id.toString(),
            patient: testPatientData,
            date: new Date().toISOString(),
            ambito: 'publico',
            trimestral: false,
            supplies: [{
                quantity: 2,
                quantityPresentation: 60,
                diagnostic: 'Dolor muscular',
                indication: 'Tomar 1 cada 12 horas',
                supply: testSupply
            }]
        };

        // Mock needle response for checking professional in ANDES
        (needle as any).mockImplementationOnce((method: string, url: string) => {
            if (url.includes('profesionales')) {
                return Promise.resolve({
                    statusCode: 200,
                    body: [{
                        id: 'andes-id-123',
                        nombre: 'Dr. Test',
                        apellido: 'Professional',
                        profesiones: [{ profesional: 'Médico' }]
                    }]
                });
            }
            return Promise.resolve({ statusCode: 200, body: [] });
        });

        // Re-use global mock setup from beforeEach

        const res = await request(app)
            .post(`${env.API_URI_PREFIX}/prescriptions/`)
            .send(payload)
            .expect(200);

        // Since sendToAndes becomes true in the controller logic, it won't be saved locally
        // unless it couldn't be sent to ANDES. Let's verify it tries to send it.
        expect(axios.post).toHaveBeenCalledTimes(1);
        const andesUrl = (axios.post as jest.Mock).mock.calls[0][0];
        expect(andesUrl).toContain('/modules/recetas');

        // The response in this specific code path for `publico` when `sendToAndes` is true 
        // actually returns an empty array since it only pushes to `allPrescription` if `!createAndes`.
        // Let's assert this behavior to ensure ANDES flow was successful.
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(0);
    });

    it('should save locally if ambito is publico but ANDES fails', async () => {
        const payload = {
            professional: testProfessional._id.toString(),
            patient: testPatientData,
            date: new Date().toISOString(),
            ambito: 'publico',
            trimestral: false,
            supplies: [{
                quantity: 2,
                quantityPresentation: 60,
                diagnostic: 'Dolor muscular',
                indication: 'Tomar 1 cada 12 horas',
                supply: testSupply
            }]
        };

        // Mock needle response for checking professional in ANDES
        (needle as any).mockImplementationOnce((method: string, url: string) => {
            if (url.includes('profesionales')) {
                return Promise.resolve({
                    statusCode: 200,
                    body: [{
                        id: 'andes-id-123',
                        nombre: 'Dr. Test',
                        apellido: 'Professional',
                        profesiones: [{ profesional: 'Médico' }]
                    }]
                });
            }
            return Promise.resolve({ statusCode: 200, body: [] });
        });

        // Implement failure for recipes but success for patients
        (axios.post as jest.Mock).mockImplementationOnce((url: string, data: any) => {
            if (url && url.includes('/modules/recetas')) {
                return Promise.reject(new Error('ANDES connection failed'));
            }
            return Promise.resolve({
                status: 200,
                data: { id: 'new-mpi-test-123', documento: data?.documento, sexo: data?.sexo }
            });
        });

        const res = await request(app)
            .post(`${env.API_URI_PREFIX}/prescriptions/`)
            .send(payload)
            .expect(200);

        expect(axios.post).toHaveBeenCalledTimes(1);

        // Because ANDES failed, it must be saved locally
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(1);
        expect(res.body[0].ambito).toBe('publico');

        const dbPrescription = await Prescription.findById(res.body[0]._id);
        expect(dbPrescription).not.toBeNull();
        expect(dbPrescription?.ambito).toBe('publico');
    });
});
