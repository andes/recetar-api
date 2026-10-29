# Tasks

## 1. Modelo e identificadores de Praxis

- [x] 1.1 Extender `ExternalIdentifierEntity` y el schema de `Prescription` con `praxis-receta`; agregar a `syncExterno.praxis` los campos `idPrescripcion`, `idAtencion`, `idReceta`, `numeroReceta`, `cuirs`, `contenidoQR` y `observacion`. Verificar con `npm run build` y un test de creación/lectura del documento.
- [x] 1.2 Agregar `numeroAutorizacion` a `dispensaSubSchema` y `estadoDispensaSubSchema`. Verificar con un test que persiste y lee el campo sin romper los documentos existentes.
- [x] 1.3 Agregar el índice de `syncExterno.praxis.idAtencion` y confirmar que el índice multikey `identificadoresExternos_entidad_valor` sigue cubriendo `praxis` y `praxis-receta`. Verificar con un test de `findByExternalIdentifier` para ambas entidades.
- [x] 1.4 Actualizar `tests/modules/prescriptions/prescription.repository.test.ts` (o un test nuevo de identificadores) con búsqueda por hash de prescripción, hash de receta e `idAtencion`. Verificar con `npx jest tests/modules/prescriptions/prescription.repository.test.ts`.

## 2. Outbound: contrato real de Praxis

- [x] 2.1 Actualizar `PraxisPrescriptionRequest` con `idAtencion` y `recetas: { cantidadRecetas, cantidadDiasEntreRecetas }`; reemplazar `PraxisPrescriptionResponse` por la forma real (`idPrescripcion` numérico, `hash`, `recetasEmitidas[]`, `mensajes[]`). Verificar con `npm run build`.
- [x] 2.2 Actualizar `PraxisMapper` para enviar `idAtencion = treatmentGroupId || prescriptionId` y, en tratamientos prolongados, `tratamientoProlongado`, `cantidadRecetas = meses` y `cantidadDiasEntreRecetas = 30`. Verificar con tests del mapper para receta simple y de N meses.
- [x] 2.3 Corregir `PraxisClient.createPrescription`: parsear el 400 como `ResultadoPrescripcion`, considerar fallo un mensaje de severidad `E` y registrar `A`/`I`. Verificar con tests de cliente usando respuestas simuladas 201 y 400.
- [x] 2.4 Actualizar `syncSupplyToPraxis` y `sync-praxis-identifiers` para guardar el hash de prescripción en `identificadoresExternos.praxis`, el hash de cada receta en `praxis-receta` y la metadata de `syncExterno.praxis`, asignando `recetasEmitidas[i]` por `ordenTratamiento`. Verificar con tests que cubran prescripción simple, N meses y menos recetas emitidas que meses.
- [x] 2.5 Actualizar `src/integrations/praxis/praxis.openapi.yaml` y `docs/paths/praxis/create.md` con el request/response real, `idAtencion`, `recetas` y hashes. Verificar con `npm run docs:build` y revisar que el YAML parsea.

## 3. Inbound: estructura, DTOs y mapper

- [x] 3.1 Crear `src/modules/praxis-events/` con controller, service, repository, routes, DTOs, mapper, errores, tipos, OpenAPI e `index.ts` como composition root. Verificar con `npm run build`.
- [x] 3.2 Definir los schemas Zod de los cinco eventos, tolerando `cie10`/`ciE10`, fechas vacías y `idAtencion` vacío. Verificar con tests de DTO para payloads válidos, inválidos y con variantes de nombre.
- [x] 3.3 Implementar el mapper de payload de Praxis a los datos que consume el dominio (renglones de dispensa, paciente/profesional/cobertura para el alta y metadatos de receta). Verificar con tests de mapeo de los ejemplos `prescripcion.json` y `dispensa.json`.

## 4. Inbound: inbox y resolución

- [x] 4.1 Crear `praxis-event.model.ts` y el repositorio del inbox con `claveIdempotencia` única y TTL para el payload. Verificar con un test que un duplicado lanza `E11000` y que el repositorio lo traduce en evento existente.
- [x] 4.2 Implementar la resolución por hash de prescripción, hash de receta, `idAtencion` y el fallback `id === idPrescripcion`. Verificar con tests de los cuatro caminos y del caso sin coincidencia.
- [x] 4.3 Implementar el procesamiento idempotente de los cinco eventos: registrar en el inbox antes de proyectar, responder 2xx al duplicado y 404 solo en anulación/dispensa con hash desconocido. Verificar con tests de servicio para cada evento y sus repeticiones.

## 5. Inbound: efectos de estado y rutas

- [x] 5.1 Implementar la dispensa total y parcial: `estadoDispensaActual`, `dispensa[]` con `numeroAutorizacion`, `sistema = 'praxis'`, `status = 'Dispensada'` y reutilización del job de reconciliación. Verificar con tests de servicio y del formato compatible.
- [x] 5.2 Implementar la anulación de prescripción y de receta: `estadoActual = 'eliminada'`, `status = 'Rechazada'`, historial `estados[]` y motivo `anulada-por-praxis`. Verificar con tests que la receta deja de aparecer en la consulta por estado vigente y que la anulación de prescripción afecta a todos los meses.
- [x] 5.3 Implementar la anulación de dispensa: `sin-dispensa`, `cancelada` y `status = 'Pendiente'` salvo que la receta esté `eliminada`. Verificar con tests de los dos casos.
- [x] 5.4 Crear el controller y las rutas de los cinco endpoints con los códigos 201/200/404/422 y el envelope de RecetAr. Verificar con tests de integración (supertest) de status, body e idempotencia.
- [x] 5.5 Crear `src/modules/praxis-events/praxis-events.openapi.yaml` con las cinco operaciones, sus schemas y códigos. Verificar con `npm run docs:build` y revisar que el YAML parsea.

## 6. Seguridad, configuración y montaje

- [x] 6.1 Implementar el middleware de IP allowlist, el flag `PRAXIS_INBOUND_ENABLED` y la validación opcional de `x-api-key`. Verificar con tests de IP permitida, IP rechazada, clave incorrecta y superficie deshabilitada.
- [x] 6.2 Agregar las variables a `src/config/config.ts`, `.env.example` y la documentación de operación (`docs/praxis-events.md`), incluyendo base URL, TTL del inbox y comportamiento fail-closed en producción. Verificar que la documentación coincide con los nombres reales de las variables.
- [x] 6.3 Montar `/praxis` en `src/routes/routes.ts` sin tocar los mounts existentes. Verificar con un test que las rutas de `/api/prescriptions` y `/api/modules/recetas` siguen respondiendo igual.

## 7. Verificación de integración

- [x] 7.1 Ejecutar `npm run build`, `npm run lint` y `npm test`; corregir cualquier fallo antes de continuar.
- [x] 7.2 Agregar un test e2e: crear receta con respuesta simulada de Praxis (hash + recetasEmitidas) → dispensa por hash de receta → anulación → verificar estados y el shape compatible de SIFAHO. Verificar con `npx jest tests/modules/prescriptions/<archivo-e2e>.test.ts`.
- [x] 7.3 Validar manualmente contra el Swagger de QA (`https://rpe-api-organizaciones-qa.praxys.com.ar/swagger/v2/swagger.json`) que el request outbound incluye `idAtencion`/`recetas` y que el parser acepta la respuesta real. Dejar registrado el resultado en la descripción del PR.

## Workflow follow-up

- Armar la descripción del PR con el template de `.github/pull_request_template.md`: variables nuevas, flag de activación, índices y comandos de Mongo, y follow-ups.
- Archivar el change después de la revisión y de que `npm run build`, `npm run lint` y `npm test` pasen.
- Follow-ups fuera de este change: `?hash=` en PDF/anulación saliente, mapeo de `idObraSocial` contra `/api/obras-sociales`, `tipoMatricula`, CIE10 real, `tipoPrescripcion` `G|M` (change `generico-sugerido-praxis`), `cuit`/`cuil`/`codigoREFEPS`/`domicilioProfesional` del prescriptor y job de reconciliación por polling.
