# Design

## Context

- `PraxisClient` ya implementa `annulPrescription` y `getPrescriptionPdf`, pero no se invocan desde ningún controlador ni ruta.
- El Swagger real de Praxis v2 (`/swagger/v2/swagger.json`) exige `hash` (query) en `GET /api/prescripciones/{id}/pdf` y `DELETE /api/prescripciones/{id}`. La respuesta de creación es `{ idPrescripcion, hash, recetasEmitidas[], mensajes[] }` (sin `estado`/`mensaje`).
- `DatosPaciente.sexo` admite `M|F|X`; `DatosProducto.codigoBarras` no es obligatorio; `DatosRenglon.tipoPrescripcion` es `G` (genérico) o `M` (marca comercial).
- Al crear, la API guarda el `idPrescripcion` en `identificadoresExternos` y el estado en `syncExterno.praxis`.
- Praxis es un servicio interno: la app no debe conocer sus identificadores.

## Goals / Non-Goals

**Goals:**

- Exponer suspensión y PDF de forma neutral, usando `idPrescripcion` + `praxisHash`.
- Persistir el `hash` y las recetas emitidas para PDF/anulación.
- Validar datos mínimos antes de enviar y mapear el sexo a `M|F|X`.
- Validar ámbito: magistral y paciente sin DNI solo en público.
- Exponer `estadoPublicacion` a la app.

**Non-Goals:**

- Modelar `tipoPrescripcion = G` (se usa `M` en el flujo comercial actual).
- Notificación de dispensa desde Praxis (webhook).
- Migrar recetas históricas.

## Decisions

- **Hash obligatorio**: se guarda `praxisHash` (prescription hash) y `praxisRecetas[]` al crear. PDF/anulación usan ambos. Alternativa: no persistir el hash; descartada porque Praxis lo exige.
- **Respuesta real**: se alinea `PraxisPrescriptionResponse` con el Swagger; `idPrescripcion` es numérico y se guarda como string. `mensajes[]` con severidad `E` se trata como fallo (no publicada).
- **Elegibilidad local-first**: `checkPraxisEligibility` exige DNI, fechaNacimiento, sexo `M|F|X`, matrícula y `codigoAlfabeta > 0`. Si no se cumple, `PraxisNotEligibleError` → `no_aplicable` (no se reintenta). El resto de fallas → `pendiente` (reintento).
- **Sexo**: `normalizeSex` mapea `Masculino→M`, `Femenino→F`, `Otro→X`.
- **Validación de ámbito**: en la creación, magistral o paciente sin DNI con ámbito privado → 422.
- **Estado neutral para app**: `toAppPrescription` agrega `estadoPublicacion` (derivado de `syncExterno.praxis.estado`; ausente → `desconocido`) y elimina `syncExterno`, `identificadoresExternos`, `praxisHash` y `praxisRecetas`.
- **Identificación del prescriptor**: el servicio completa `cuil`/`enrollment`/`profesionGrado` desde el usuario cuando el cliente no los envía. El mapper prioriza `numeroMatricula`, usa `enrollment` como fallback, toma `tipoMatricula`/`idProvinciaMatricula` de env (default `P`/`Q`), deriva `tipoPrescriptor` de la profesión (`M`/`O`) y envía `cuit` cuando existe. Si la profesión no es soportada → `no_aplicable`.
- **Fuente de la formación**: ANDES expone la formación en `formacionGrado` (endpoint `/core/tm/profesionales?documento=&busquedaExacta=true`), no en `profesiones`. El cliente y el mapper usan `formacionGrado` con fallback a `profesiones`; el sync corre en login/registro y, si falta en el usuario, se consulta ANDES al crear la receta.

## Risks / Trade-offs

- [Praxis rechaza datos de cobertura/ matrícula] → quedan en `pendiente`/`error` observables; la elegibilidad cubre lo mínimo.
- [Recetas viejas sin estado] → `estadoPublicacion = desconocido` (comportamiento histórico).
- [Anulación fallida] → local-first: la suspensión local persiste y el fallo se registra.

## Open Questions

- ¿Reintento automático de anulaciones fallidas en Praxis? Se propone follow-up con job.
