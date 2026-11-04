# RecetAR API

NodeJS + MongoDB API for Prescriptions Management

## Observabilidad operacional (contrato v1)

La API emite logs, trazas y métricas por OTLP hacia el stack `andes/observabilidad`.
Contrato: `observability/contract` v1 (ADR 0001 de `@andes/log`).

### Bootstrap

`src/telemetry.ts` debe ser el **primer import** de `src/server.ts`: el SDK de OTel
tiene que arrancar antes de Express y Pino.

```typescript
import './telemetry';
import express from 'express';
```

Alternativa si se controla el entrypoint de despliegue:

```bash
node --require @andes/log/register dist/src/server.js
```

### Variables

| Variable | Default | Rol |
|---|---|---|
| `SERVICE_NAME` | `unknown` | `service.name` (obligatorio) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | Base OTLP de Alloy |
| `DEPLOYMENT_ENVIRONMENT` | `local` | `deployment.environment` |
| `INSTANCE_ID` | `1` | `service.instance.id` (metadata) |
| `APP_VERSION` | `npm_package_version` | `version` del wide event |
| `LOG_LEVEL` | `info` | Nivel mínimo de Pino |
| `LOG_SAMPLE_RATE` | `0.05` | Sample de wide events exitosos |
| `LOG_SLOW_THRESHOLD_MS` | `1000` | Umbral de request lento |
| `LOG_HTTP_ACCESS` | off | Access log de `pino-http` |
| `OTEL_TRACES_SAMPLER_RATIO` | `1` | Ratio de trazas raíz |

### Cierre ordenado

`SIGTERM`/`SIGINT` cierran el servidor HTTP, hacen flush del SDK con un timeout de 3 s
y recién entonces finalizan el proceso. La librería no secuestra la señal.

### Verificación

Con el stack arriba:

```logql
{service_name="recetar-api"} | level="error"
{service_name="recetar-api"} | level="error" | trace_id != ""
```

1. Un request debe aparecer como traza en Tempo y como wide event en Loki con el mismo `trace_id`.
2. No debe haber líneas duplicadas por stdout.
3. `./scripts/validate.sh local` (en `observabilidad`) valida ingesta, labels y nivel.

No emitir PII/PHI: sólo identificadores internos no sensibles. No usar `obs.enabled=true`
en este servicio: ya exporta logs por OTLP.
