/**
 * Bootstrap de OpenTelemetry. Debe ser el primer import del entrypoint:
 * el SDK tiene que arrancar antes de cargar Express y Pino.
 */
import { initLogger, initOtel, shutdownOtel } from '@andes/log';
import { resolveTelemetryConfig } from './telemetry.config';

const config = resolveTelemetryConfig();

if (config.missingServiceName) {
    process.emitWarning(
        '[recetar-api] SERVICE_NAME no definido: el resource OTLP quedará como "unknown".',
        'AndesLogOtelWarning'
    );
}

initOtel({
    serviceName: config.serviceName,
    instanceId: config.instanceId,
    environment: config.environment,
    endpoint: config.endpoint,
});

export const baseLogger = initLogger({ serviceName: config.serviceName });

export function shutdownTelemetry(): Promise<void> {
    return shutdownOtel();
}
