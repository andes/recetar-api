# Design

## Context

Ver `proposal.md` — Why. Condiciones que determinan el enfoque:

- `REC-306` es la rama modular más nueva y **no** contiene la integración; `CORE-129` (06/10) sí la tiene, pero difiere en más de cien archivos del refactor de negocio y no es ancestro.
- `CORE-129` se rehace con rebase sobre `REC-306`. Evidencia: de sus tres commits exclusivos, `780529b` es duplicado exacto de `1777cce` (mismo patch-id), `41f2281` fue reemplazado por `19b00bf` en `REC-306`, y sólo `e8cb7fb` (observabilidad) es único y se conserva.
- El despliegue no vive en el repo (sin Dockerfile ni compose): no se puede garantizar `--require` ni `NODE_OPTIONS` desde acá.
- `agenda-ui` corre como proceso separado (`start:all`) y hoy no inicializa telemetría.
- La API ya tiene Jest 30 y Supertest 7; el script de test usa `--forceExit`.
- `@andes/log` v4 expone `initOtel`, `initLogger`, `createLogger`, `httpMiddleware`, `wideEventMiddleware` y `shutdownOtel`; `initOtel` es idempotente.

## Goals / Non-Goals

**Goals:**

- Dejar la instrumentación operativa en la rama activa, con bootstrap temprano y cierre ordenado.
- Que el repo documente y verifique su parte sin depender de otros repos.

**Non-Goals:**

- Cambiar endpoints, contratos REST o lógica de negocio.
- Instrumentar `agenda-ui` en esta iteración.
- Implementar auditoría de dominio ni migrar `@andes/log` v2.
- Resolver el entrypoint de despliegue (queda documentado como alternativa `--require`).

## Decisions

### D1. Rebase de `CORE-129` sobre `REC-306`, sin merge del refactor ajeno

Se rehace `CORE-129` con rebase sobre `REC-306` y se conserva únicamente `e8cb7fb` (observabilidad). Los otros dos commits exclusivos ya están en `REC-306` con otra forma (`780529b` es idéntico por patch-id y `41f2281` fue reemplazado por `19b00bf`), así que no aportan nada y sólo generarían conflictos.

Alternativas descartadas: mergear `CORE-129` completo sobre `REC-306` (arrastra duplicados y conflictos del refactor de negocio) y portar los tres commits a mano (trabajo sin valor para dos de ellos).

### D2. Bootstrap por primer import (`src/telemetry.ts`)

`server.ts` comienza con `import './telemetry';` antes de `express`, `cors`, la config y las rutas. En CommonJS el orden de `require` se preserva, así que el SDK arranca antes de que se carguen Express y Pino, condición para que las instrumentaciones automáticas enganchen el framework.

Alternativa descartada: `--require @andes/log/register` como única vía. Es la más robusta, pero depende de un entrypoint que no está en el repo; se documenta como opción para quien despliega.

Riesgo de orden: se cubre con un test que verifique que `telemetry` se evalúa antes que `express` (espía de módulos) y con la verificación manual de spans.

### D3. Identidad por entorno, sin `serviceName` hardcodeado

`telemetry.ts` resuelve la configuración desde el entorno:

- `SERVICE_NAME` (obligatorio; si falta, `unknown` y `AndesLogOtelWarning`).
- `OTEL_EXPORTER_OTLP_ENDPOINT`, `DEPLOYMENT_ENVIRONMENT`, `INSTANCE_ID`.
- `APP_VERSION` para el wide event.

`server.ts` deja de llamar `initObservability({ serviceName: 'recetar-api' })`; el módulo de telemetría llama `initOtel` e `initLogger` una sola vez. Así no hay dos fuentes para el mismo dato y el resource no se intenta reconfigurar después del arranque.

### D4. Cierre ordenado con timeout

`gracefulShutdown()` deja de hacer `process.exit(0)` inmediato:

1. `server.close()` con callback.
2. `Promise.race` entre `shutdownOtel()` y un timeout corto (p. ej. 3 s) para no colgarse si Alloy no responde.
3. `process.exit(0)` sólo al finalizar el flush.

Se registra también `SIGINT` con la misma ruta. `server.close()` puede esperar conexiones keep-alive; se usa `closeIdleConnections()`/`closeAllConnections()` cuando el runtime lo permita y el timeout como red de seguridad.

### D5. Wide event y access log desde la librería

Se usa `wideEventMiddleware(createLogger('wide-event'))` y `httpMiddleware()` sin `autoLogging`; el access canónico es el wide event. `version` se alimenta de `APP_VERSION`. No se duplican atributos de resource en el middleware local porque la librería ya los emite en el `base` de Pino.

### D6. `agenda-ui` fuera de alcance

Es un proceso distinto y su telemetría no forma parte de esta alineación. Queda documentado; si se necesita, se abre un change propio reutilizando `src/telemetry.ts`.

### D7. Documentación autosuficiente en el repo

`README.md` y `.env.example` explican bootstrap, variables, verificación y versión del contrato (`observability/contract` v1). Un lector del repo no necesita abrir `log` ni `work` para operar la API.

## Risks / Trade-offs

- [Conflictos al portar `e8cb7fb`] → port manual archivo por archivo, con `npm run lint` y `npm run build` por paso, en vez de cherry-pick a ciegas.
- [El primer import puede perderse en un refactor] → test que fija el orden y comentario en `server.ts`.
- [`shutdownOtel()` colgado por exportador inalcanzable] → `Promise.race` con timeout y test del camino sin colector.
- [`server.close()` espera keep-alive] → cierre de conexiones inactivas y timeout de respaldo.
- [Doble configuración de identidad] → una sola fuente (`telemetry.ts`) y warning si alguien intenta reconfigurar el resource.

## Migration Plan

1. Rehacer `CORE-129` con rebase sobre `REC-306` conservando `e8cb7fb`; correr lint, build y tests.
2. Aplicar el bootstrap de telemetría y el cierre ordenado en esa rama.
3. Definir `SERVICE_NAME=recetar-api` y `OTEL_EXPORTER_OTLP_ENDPOINT` en el entorno de despliegue, junto con `APP_VERSION`.
4. Desplegar y verificar en Grafana: traza en Tempo y wide events en Loki con el mismo `trace_id`, labels `service_name=recetar-api` y `deployment_environment` correctos, sin líneas duplicadas.
5. Rollback: quitar el primer import de `telemetry` deja el comportamiento anterior; no hay cambios de datos ni de API.

## Open Questions

Ninguna que bloquee specs, enfoque o tareas.
