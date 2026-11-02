export interface TelemetryConfig {
    serviceName: string;
    environment?: string;
    instanceId?: string;
    endpoint?: string;
    appVersion?: string;
    missingServiceName: boolean;
}

/**
 * Resuelve la configuración de telemetría desde el entorno.
 * No aplica defaults propios: la librería ya define los suyos.
 */
export function resolveTelemetryConfig(env: NodeJS.ProcessEnv = process.env): TelemetryConfig {
    const serviceName = (env.SERVICE_NAME || '').trim();

    return {
        serviceName: serviceName || 'unknown',
        environment: env.DEPLOYMENT_ENVIRONMENT,
        instanceId: env.INSTANCE_ID,
        endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
        appVersion: env.APP_VERSION || env.npm_package_version,
        missingServiceName: !serviceName,
    };
}
