import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    globalSetup: '<rootDir>/tests/globalSetup.ts',
    globalTeardown: '<rootDir>/tests/globalTeardown.ts',
    setupFiles: ['<rootDir>/tests/env-setup.ts'],
    testMatch: ['**/*.test.ts'],
    maxWorkers: 1,
    clearMocks: true,
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 80,
            lines: 85,
            statements: 85,
        },
    },
};

export default config;
