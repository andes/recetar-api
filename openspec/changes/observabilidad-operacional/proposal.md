# Proposal

## Why

`recetar-api` necesita emitir logs, trazas y métricas operacionales por OTLP hacia el stack `observabilidad` (contrato `observability/contract` v1). La integración existe sólo en la rama `CORE-129`: un `initObservability()` tardío dentro de `server.ts`, sin `SERVICE_NAME`, sin bootstrap previo a Express/Pino y con un `gracefulShutdown()` que hace `process.exit(0)` sin flush. En la rama modular activa (`REC-306`) no hay integración alguna.

## What Changes

- Portar la integración de `@andes/log` v4 a la rama modular activa, sin reintroducir cambios del refactor previo.
- Rehacer la rama `CORE-129` con rebase sobre `REC-306`, que es la que tiene los últimos cambios de la nueva versión; allí se conserva sólo el commit de observabilidad.
- Inicializar OTel como primer import del proceso (`src/telemetry.ts`), de modo que Express y Pino se carguen después del SDK.
- Fijar la identidad del servicio por entorno: `SERVICE_NAME`, `DEPLOYMENT_ENVIRONMENT`, `INSTANCE_ID`, `APP_VERSION` y `OTEL_EXPORTER_OTLP_ENDPOINT`.
- Cerrar de forma ordenada: cerrar el servidor HTTP y ejecutar `shutdownOtel()` en `SIGTERM`/`SIGINT`.
- Documentar el uso en el repo (README y `.env.example`) para que el equipo pueda operar e integrar sin consultar otros repos.
- Sin cambios en endpoints, contratos REST ni datos de negocio.

## Capabilities

### New Capabilities
- `operational-observability`: comportamiento de `recetar-api` como emisor del canal operacional (bootstrap, identidad, wide events, sampling, PII y cierre ordenado).

### Modified Capabilities

Ninguna: no cambian requirements de recetas, autorización ni integraciones de negocio.

## Impact

- **Código**: `src/telemetry.ts` (nuevo) y `src/server.ts` (primer import, cierre ordenado). `src/agenda-ui.ts` queda fuera salvo que se decida instrumentarlo.
- **Rama**: el trabajo se hace en `CORE-129`, rehecha con rebase sobre `REC-306`; el único commit exclusivo que se conserva es `e8cb7fb` (observabilidad).
- **Dependencias**: `@andes/log` v4 (`file:../log` en desarrollo) ya presente en `CORE-129`; se reutiliza en la rama destino.
- **Configuración**: `SERVICE_NAME=recetar-api`, `OTEL_EXPORTER_OTLP_ENDPOINT=http://<alloy>:4318`, `DEPLOYMENT_ENVIRONMENT`, `INSTANCE_ID`, `APP_VERSION`. El despliegue vive fuera del repo: el bootstrap por import evita depender del entrypoint.
- **Documentación**: `README.md` y `.env.example` con bootstrap, variables y verificación; referencia al contrato v1 y su versión.
- **Observabilidad**: deja de usar scrape de stdout (`obs.enabled`) para logs operacionales.
- Fuera de alcance: instrumentación del frontend, auditoría Mongo y cambios en `agenda-ui`.
