const { GenericContainer } = require('testcontainers');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('Starting MongoDB container...');
    try {
        const container = await new GenericContainer('mongo:4.4')
            .withExposedPorts(27017)
            .start();

        const host = container.getHost();
        const port = container.getMappedPort(27017);
        const uri = `mongodb://${host}:${port}/test_database`;

        console.log(`MongoDB container started at ${uri}`);

        const envFile = path.join(process.cwd(), '.testcontainers.env');
        fs.writeFileSync(envFile, `TEST_MONGODB_URI=${uri}\n`);

        console.log(`Connection string saved to ${envFile}`);

        console.log('Running user seeding script...');
        try {
            require('child_process').execSync('npx ts-node scripts/seed-test-users.ts', { stdio: 'inherit' });
        } catch (seedErr) {
            console.error('Error running seed script:', seedErr);
        }

        console.log('Press Ctrl+C to stop the container.');

        process.on('SIGINT', async () => {
            console.log('\nStopping MongoDB container...');
            await container.stop();
            if (fs.existsSync(envFile)) {
                fs.unlinkSync(envFile);
            }
            console.log('Container stopped and cleanup complete.');
            process.exit(0);
        });

        // Keep the process alive
        setInterval(() => { }, 1000);
    } catch (err) {
        console.error('Failed to start container:', err);
        process.exit(1);
    }
}

main();
