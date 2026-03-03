import mongoose from 'mongoose';
import User from '../src/models/user.model';
import Role from '../src/models/role.model';

require('dotenv').config({ path: '.testcontainers.env' }); // Load the test DB URI

async function seed() {
    const uri = process.env.TEST_MONGODB_URI;
    if (!uri) {
        console.error('TEST_MONGODB_URI is not set. Cannot seed database.');
        process.exit(1);
    }

    try {
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false
        });

        console.log('Connected to MongoDB for seeding...');

        // 1. Create Roles
        let roleProfessional = await Role.findOne({ role: 'professional' });
        if (!roleProfessional) {
            roleProfessional = await Role.create({ role: 'professional' });
        }

        let rolePharmacist = await Role.findOne({ role: 'pharmacist' });
        if (!rolePharmacist) {
            rolePharmacist = await Role.create({ role: 'pharmacist' });
        }

        // 2. Create Professional User
        const profExists = await User.findOne({ username: 'profesional_test' });
        if (!profExists) {
            const profUser = new User({
                username: 'profesional_test',
                password: 'password123',
                email: 'profesional@test.com',
                businessName: 'Profesional Test',
                isActive: true
            });
            profUser.roles.push(roleProfessional._id);
            await profUser.save();

            roleProfessional.users.push(profUser._id);
            await roleProfessional.save();

            console.log('Professional user created: username="profesional_test", password="password123"');
        } else {
            console.log('Professional user already exists.');
        }

        // 3. Create Pharmacist User
        const pharmExists = await User.findOne({ username: 'farmacia_test' });
        if (!pharmExists) {
            const pharmUser = new User({
                username: 'farmacia_test',
                password: 'password123',
                email: 'farmacia@test.com',
                businessName: 'Farmacia Test',
                isActive: true
            });
            pharmUser.roles.push(rolePharmacist._id);
            await pharmUser.save();

            rolePharmacist.users.push(pharmUser._id);
            await rolePharmacist.save();

            console.log('Pharmacist user created: username="farmacia_test", password="password123"');
        } else {
            console.log('Pharmacist user already exists.');
        }

        console.log('Seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    }
}

seed();
