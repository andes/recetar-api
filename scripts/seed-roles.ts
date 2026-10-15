import { initializeMongo } from '../src/database/dbconfig';
import { seedRoles } from '../src/shared/seed/roles';

async function main(): Promise<void> {
    await initializeMongo();
    await seedRoles();
    // eslint-disable-next-line no-console
    console.log('Roles seeded');
    process.exit(0);
}

main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Error seeding roles:', error);
    process.exit(1);
});
