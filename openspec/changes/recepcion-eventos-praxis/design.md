# Design

## Context

Ver `proposal.md - Why`. El estado relevante del código:

- `Prescription` guarda `identificadoresExternos` (`praxis`, `prestacion`, `registro`) con índice multikey no único, y `syncExterno.praxis` con `estado`, `intentos` y `ultimoError`.
- La creación en Praxis se hace por insumo en `PrescriptionService.syncSupplyToPraxis` y en el job `sync-praxis-identifiers`; hoy solo se guarda `idPrescripcion`.
- La API v2 de Praxis (QA 2.2) devuelve `idPrescripcion`, `hash`, `recetasEmitidas[]` y `mensajes[]`; acepta `idAtencion` y `recetas.cantidadRecetas`/`cantidadDiasEntreRecetas`.
- El contrato de eventos (PDF) usa dos hashes: el de prescripción (`/prescripciones/:hash`) y el de receta (`/recetas/:hash` y `/recetas/:hash/dispensa`).
- El hub compatible (`/modules/recetas`) filtra por `status`, no por `estadoActual.tipo`; la anulación necesita ambos para ocultar la receta de SIFAHO.

## Goals / Non-Goals

**Goals:**
- Guardar al crear los hashes y la metadata de cada receta emitida, de modo que los eventos inbound resuelvan sin heurísticas.
- Recibir las cinco operaciones del PDF de forma idempotente y con la semántica 2xx/404.
- Reflejar dispensa y anulación en el estado que consume SIFAHO.
- Mantener intactas las APIs existentes.

**Non-Goals:**
- Crear localmente prescripciones originadas exclusivamente en Praxis (el POST solo registra/vincula).
- Corregir la deuda de calidad del envío (obra social, matrícula, CIE10, `tipoPrescripcion`); queda como follow-up.
- Implementar un job de reconciliación por polling; se evalúa después.

## Decisions

### Superficie y módulo

- **Prefijo `/api/praxis`.** La base es configurable en Praxis (`<DireccionBaseServicio>`), así que no hay colisión con `/api/prescriptions` ni `/api/modules/recetas`. Alternativa: montar en la raíz (`/prescripciones`), descartada porque acopla el contrato externo al prefijo global y complica el despliegue.
- **Módulo nuevo `src/modules/praxis-events/`.** Controller, service, repository (inbox), DTOs, mapper, errores, routes, OpenAPI e `index.ts` como composition root. Depende de `PrescriptionRepository`/`PrescriptionService` y del mapper de `src/integrations/praxis/`. Alternativa: colgar las rutas de `modules/prescriptions/`; se descarta para no mezclar el contrato ANDES con el de Praxis.
- **Rutas en español y tal cual el PDF** (`/prescripciones`, `/recetas/:hash/dispensa`), porque son un contrato externo. Es una excepción deliberada a la convención de nombres en inglés del proyecto.

### Modelo de datos

- `identificadoresExternos`:
  - `praxis` = hash de prescripción (el que usa `DELETE /prescripciones/:hash`).
  - `praxis-receta` = hash de receta (el que usa dispensa/anulación individual).
  - `prestacion` y `registro` no cambian.
- `syncExterno.praxis` se amplía con `idPrescripcion`, `idAtencion`, `idReceta`, `numeroReceta`, `cuirs[]`, `contenidoQR`, `observacion`.
- `dispensaSubSchema` y `estadoDispensaSubSchema` agregan `numeroAutorizacion` (número de OPF). `idDispensaApp` se conserva.
- Índices: el índice `identificadoresExternos_entidad_valor` ya cubre la búsqueda por hash; se agrega `syncExterno.praxis.idAtencion` si se usa como correlación y el índice único del inbox.
- Alternativa: un subdocumento `praxis` dedicado. Se descarta para reutilizar el índice y el método `findByExternalIdentifier` existentes, y para no duplicar la identidad externa.

### Inbox de eventos

- Colección `praxisEvents` con `claveIdempotencia` única, `tipo`, `hash`, `recetaHash`, `numeroAutorizacion`, `payload`, `recibidoEn`, `estado` (`procesado` | `desconocido` | `error`) y `prescriptionId`.
- Clave por tipo:
  - alta: `alta:${hash}`
  - anulación de prescripción: `anulacion-prescripcion:${hash}`
  - anulación de receta: `anulacion-receta:${hash}`
  - dispensa: `dispensa:${hash}:${numeroAutorizacion}`
  - anulación de dispensa: `anulacion-dispensa:${hash}`
- Se registra todo evento entrante antes de proyectar. Un duplicado se detecta por `E11000` y se responde 2xx con el resultado previo; nunca 500. Esto cubre los 5 reintentos de Praxis.
- Alternativa: no persistir el alta desconocida. Se descarta porque perdería los hashes de recetas de prescripciones que no llegamos a guardar.

### Resolución

- Alta: buscar por `identificadoresExternos.praxis = hash`; si no aparece, buscar por `idAtencion` y, como fallback de transición, por `syncExterno.praxis.idPrescripcion = id` (el `id` del evento es el `idPrescripcion` de la v2). Si no se encuentra, guardar en el inbox y responder 2xx.
- Anulación de prescripción: buscar todos los docs por hash de prescripción; si no hay, 404.
- Anulación de receta y dispensa: buscar el doc por hash de receta; si no hay, 404.
- Alternativa: correlacionar por paciente/fecha/producto. Se descarta por frágil; el hash y `idAtencion` alcanzan.

### Efectos de estado

| Evento | `estadoActual` | `estadoDispensaActual` | `status` |
|---|---|---|---|
| Dispensa total | `finalizada` | `dispensada` | `Dispensada` |
| Dispensa parcial | sin cambio | `dispensa-parcial` | `Dispensada` (el job reconcilia) |
| Anulación de receta/prescripción | `eliminada` | sin cambio | `Rechazada` |
| Anulación de dispensa | sin cambio | `sin-dispensa` + `cancelada` | `Pendiente` si no está `eliminada` |

- La anulación usa `estadoActual.tipo = 'eliminada'` (convención legacy) y `status = 'Rechazada'` para que el filtro `?estado=vigente` del hub no la devuelva. Se agrega el estado al historial `estados[]` con motivo `anulada-por-praxis`.
- La dispensa usa `sistema = 'praxis'` y guarda `numeroAutorizacion`; si SIFAHO no tolera el valor, el fallback es `sistema = 'recetar'` + `origen = 'praxis'` (a validar en QA).
- La dispensa parcial reutiliza `pushDispensa` y el job `actualizar-estados-dispensa`; no se inventa una máquina de estados nueva.

### Outbound

- `PraxisMapper` agrega `idAtencion = treatmentGroupId || prescriptionId` y, si hay meses, `tratamientoProlongado: true`, `recetas: { cantidadRecetas: meses, cantidadDiasEntreRecetas: 30 }`.
- `PraxisPrescriptionResponse` refleja `ResultadoPrescripcion` real (`idPrescripcion` numérico, `hash`, `recetasEmitidas[]`, `mensajes[]`).
- El cliente considera fallo un mensaje de severidad `E` y registra `A`/`I` como observación; el 400 se parsea con el mismo schema (`mensajes[]`), no con `{ error, mensaje }`.
- Al persistir, `recetasEmitidas[i]` se asigna al doc con `ordenTratamiento = i`; si Praxis emite menos, los docs sobrantes quedan sin `praxis-receta` y con una observación.
- `idPrescripcion` (int64) se guarda como string en la metadata; el hash ocupa `identificadoresExternos.praxis`.
- Alternativa: seguir usando `praxis` para `idPrescripcion` y agregar entidades nuevas para los hashes. Se descarta porque el hash es la clave del contrato externo y la metadata ya tiene lugar para el id.

### Seguridad

- `PRAXIS_INBOUND_ENABLED` (default `true`): permite apagar la superficie sin desmontar rutas.
- `PRAXIS_INBOUND_ALLOWED_IPS`: lista de IPs/CIDR. En producción, si está vacía, se rechaza todo (fail closed); en desarrollo/test se permite todo.
- `PRAXIS_INBOUND_API_KEY` (opcional): si está configurada, se exige `x-api-key`.
- HTTPS en el borde; `trust proxy` configurable y verificación opcional de `x-forwarded-proto` con `PRAXIS_INBOUND_ENFORCE_HTTPS`.
- Alternativa: exigir token de aplicación de RecetAr. Se descarta porque el PDF no lo define y Praxis no lo envía; la allowlist + clave compartida es el mínimo compatible.
- El `payload` del inbox contiene datos del paciente: se agrega TTL (por ejemplo 180 días) y no se expone por API pública.

## Risks / Trade-offs

- [Praxis no tiene IPs de egreso estáticas] → usar `x-api-key` como segunda barrera y coordinar con Praxis; la allowlist sigue activa.
- [Recetas históricas sin hash] → el alta puede vincular por `id`/`idPrescripcion`; si tampoco existe, no son resolubles por hash y los eventos darán 404. Se documenta como limitación de la transición.
- [Praxis emite menos recetas que meses locales] → se asignan las emitidas por orden y se registra observación; esos meses no serán dispensables por hash.
- [Duplicados concurrentes] → índice único + captura de `E11000` y respuesta 2xx.
- [Evento de dispensa antes del alta/binding] → 404 y reintento de Praxis hasta 5 veces; si el alta llega en ese lapso, el reintento resuelve.
- [SIFAHO no reconoce `sistema='praxis'`] → validar en QA; fallback `recetar` + `origen`.
- [PII duplicada en el inbox] → TTL y acceso restringido; alternativa futura: guardar solo los campos necesarios.
- [El envío outbound falla por datos de obra social/matrícula] → es deuda previa; sin hash no hay inbound. Se prioriza el mapeo de obra social en un follow-up.
- [La anulación de una receta dispensada] → se marca `eliminada` y se conserva el historial de dispensa; no se borra la dispensa.

## Migration Plan

1. Desplegar primero el modelo y la captura outbound (hash/recetas/idAtencion). Las recetas nuevas quedan resolubles.
2. Crear los índices declarados en el schema (`identificadoresExternos_entidad_valor` ya existe; agregar el de `praxisEvents.claveIdempotencia` y el de `syncExterno.praxis.idAtencion` si se usa).
3. Configurar Praxis con la URL base `https://<host>/api/praxis` y los IPs de egreso; cargar `PRAXIS_INBOUND_*`.
4. Activar la superficie; monitorear `praxisEvents` y `syncExterno.praxis`.
5. Rollback: `PRAXIS_INBOUND_ENABLED=false` (las rutas quedan inertes) y, si hace falta, quitar el mount. La captura outbound es aditiva y compatible hacia atrás.
6. No hay migración de datos obligatoria. Las recetas históricas se resuelven por el fallback del alta si el evento trae `id`/`idAtencion`.

## Open Questions

- ¿Cuáles son los IPs de egreso de Praxis en QA y producción? (operativo; no cambia el diseño).
- ¿Conviene un job de reconciliación por polling a `GET /api/recetas/{idReceta}?hash=` para eventos perdidos? (follow-up; no bloquea).
- ¿SIFAHO/HUDS toleran `sistema = 'praxis'`? (validación de QA; fallback definido).

## Validation

- **QA Demo (2026-10-29)**: `POST /api/v2/prescripcion` real devolvió 201 con `idPrescripcion: 12222`, `hash`, `recetasEmitidas[0]` (`numeroReceta`, `idReceta`, `hash`, `contenidoQR`) y `mensajes[]` con severidad `A`; la anulación de la prescripción devolvió 200. El shape coincide con el Swagger y con `PraxisPrescriptionResponse`.
- El Demo devolvió `cuirs: [null]`; `savePraxisResponse` normaliza los nulos a `undefined` antes de persistir.
- Para crear, el Demo exigió identificar al prescriptor con `cuit` y matrícula/provincia válidas; un `cuil` de paciente inválido devuelve 400. El mapper actual no envía `cuit`/`cuil`/`codigoREFEPS`/`domicilioProfesional`; queda como follow-up de calidad outbound (junto con obra social, matrícula y CIE10).
