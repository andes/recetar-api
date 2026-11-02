# Tasks

## 1. Port de la integración a la rama activa

- [x] 1.1 Rehacer `CORE-129` con rebase sobre `REC-306` conservando únicamente `e8cb7fb` (observabilidad). Verificar con `git log --oneline REC-306..CORE-129` que no queden otros commits y con `npm run build` que la rama resultante compila.
- [x] 1.2 Agregar `@andes/log` (`file:../log` en desarrollo) a `package.json` y portar los imports de `createLogger`/`Logger` en los módulos que ya los usaban en `CORE-129`. Verificar con `npm install`, `npm run lint` y `npm run build`.
- [x] 1.3 Ajustar `src/shared/logger/logger.interface.ts` para re-exportar el tipo `Logger` de la librería y eliminar imports locales obsoletos. Verificar con `grep -rn "logger.interface" src/` que no queden referencias rotas.

## 2. Bootstrap de telemetría

- [x] 2.1 Crear `src/telemetry.ts` que resuelva `SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `DEPLOYMENT_ENVIRONMENT`, `INSTANCE_ID` y `APP_VERSION`, inicialice OTel y el logger base, y no hardcodee el nombre del servicio. Verificar con un test unitario de resolución de entorno (incluido el warning por `SERVICE_NAME` ausente).
- [x] 2.2 Importar `./telemetry` como primer import de `src/server.ts` y quitar el `initObservability()` embebido. Verificar con un test que fije el orden de carga (telemetría antes que `express`) y con un request real que aparezca span HTTP en Tempo.
- [x] 2.3 Documentar en `README.md` y `.env.example` el bootstrap, las variables, la versión del contrato (`observability/contract` v1) y los pasos de verificación. Verificar que un lector del repo completa la integración sin abrir otros repos.

## 3. Cierre ordenado

- [x] 3.1 Implementar `gracefulShutdown()` con `server.close()`, cierre de conexiones inactivas y `Promise.race` entre `shutdownOtel()` y un timeout de 3 s, registrado para `SIGTERM` y `SIGINT`. Verificar con un test que el orden sea cerrar servidor, hacer flush y recién entonces salir.
- [x] 3.2 Verificar el camino degradado: arrancar con `OTEL_EXPORTER_OTLP_ENDPOINT` inalcanzable y enviar `SIGTERM`; el proceso debe cerrar dentro del timeout sin colgarse. Registrar el comando utilizado en la descripción del PR.

## 4. Wide events y sampling

- [x] 4.1 Usar `httpMiddleware()` y `wideEventMiddleware(createLogger('wide-event'))` sin access log adicional, con `version` desde `APP_VERSION`. Verificar con Supertest que `X-Request-Id` se respete y se devuelva, y que el wide event incluya `action`, `status_code`, `outcome` y `duration_ms`.
- [x] 4.2 Verificar la política de sampling: con `LOG_SAMPLE_RATE=0` un request 500 igual emite wide event, y con `OTEL_TRACES_SAMPLER_RATIO=0` no se exportan trazas pero sí logs. Registrar las variables usadas y el resultado observado.

## 5. Integración y cierre del repo

- [x] 5.1 Ejecutar `npm run lint`, `npm run build` y `npm test` completos y dejar la suite en verde. Verificar que no queden warnings de TypeScript ni imports sin uso.
- [x] 5.2 Verificación end-to-end contra el stack: un request a la API produce traza en Tempo y wide event en Loki con el mismo `trace_id`, labels `service_name=recetar-api` y `deployment_environment` correctos, sin líneas duplicadas por stdout. Adjuntar las queries y el resultado en el PR.

## Workflow follow-up

- Archivar con `openspec archive` cuando 1–4 estén completos y 5.2 verificado.
- Reportar rama y commit en el change paraguas `work/openspec/changes/alineacion-observabilidad-multirepo` (tarea 3.2).
