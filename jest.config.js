module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.ts'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    moduleDirectories: ['node_modules', 'src'],
    testTimeout: 120000 // Aumentado para dar tiempo a Testcontainers
};
