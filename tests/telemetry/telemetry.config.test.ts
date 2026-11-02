import { resolveTelemetryConfig } from '../../src/telemetry.config';

describe('resolveTelemetryConfig', () => {
    it('resuelve la identidad desde el entorno', () => {
        const config = resolveTelemetryConfig({
            SERVICE_NAME: 'recetar-api',
            DEPLOYMENT_ENVIRONMENT: 'prod',
            INSTANCE_ID: 'api-1',
            APP_VERSION: '1.2.3',
            OTEL_EXPORTER_OTLP_ENDPOINT: 'http://alloy:4318',
        });

        expect(config).toEqual({
            serviceName: 'recetar-api',
            environment: 'prod',
            instanceId: 'api-1',
            endpoint: 'http://alloy:4318',
            appVersion: '1.2.3',
            missingServiceName: false,
        });
    });

    it('marca unknown y advierte cuando falta SERVICE_NAME', () => {
        const config = resolveTelemetryConfig({});

        expect(config.serviceName).toBe('unknown');
        expect(config.missingServiceName).toBe(true);
    });

    it('usa npm_package_version como fallback de APP_VERSION', () => {
        const config = resolveTelemetryConfig({
            SERVICE_NAME: 'recetar-api',
            npm_package_version: '0.9.0',
        });

        expect(config.appVersion).toBe('0.9.0');
    });
});
