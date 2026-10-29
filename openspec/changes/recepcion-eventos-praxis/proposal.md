# Proposal

## Why

Praxis (RPE) necesita notificar en línea el ciclo de vida de las prescripciones: prescripción emitida, anulaciones y dispensa. Hoy RecetAr solo **envía** recetas a Praxis por la API v2; no existe el servicio receptor que describe el documento "RPe - Envío de prescripciones a servicios REST". Como consecuencia, una receta anulada o dispensada en Praxis sigue figurando como disponible en RecetAr y SIFAHO puede ofrecerla o dispensarla indebidamente.

La API v2 de Praxis (QA, versión 2.2) confirma que la creación devuelve `hash`, `recetasEmitidas[]` (con `hash`, `idReceta`, `numeroReceta`, `cuirs` y `contenidoQR`) y `mensajes[]`, y que acepta `idAtencion` y `recetas.cantidadRecetas`. Eso permite guardar los identificadores al crear y resolver los eventos entrantes sin heurísticas.

## What Changes

- **Nueva superficie inbound** bajo `/api/praxis`, aditiva y separada de las APIs actuales, con las cinco operaciones del contrato: alta de prescripción, anulación de prescripción, anulación de receta, dispensa y anulación de dispensa.
- **Captura de identificadores al crear**: se persiste el `hash` de prescripción y el `hash` de cada receta (`recetasEmitidas[]`) en los documentos locales, indexados para búsqueda por hash.
- **Alineación de recetas emitidas**: al crear en Praxis se envía `idAtencion` (identificador de correlación de la organización) y, en tratamientos prolongados, `recetas.cantidadRecetas` y `cantidadDiasEntreRecetas` para que Praxis emita la misma cantidad de recetas que documentos locales.
- **Dispensa**: se registra `numeroAutorizacion` y los renglones dispensados; la receta pasa a `dispensada` o `dispensa-parcial` y queda disponible/actualizada para SIFAHO.
- **Anulación**: la receta o prescripción anulada se marca con `estadoActual.tipo = 'eliminada'` y `status = 'Rechazada'`, de modo que SIFAHO deje de ofrecerla.
- **Idempotencia y semántica HTTP del contrato**: repetir un alta o una anulación responde 2xx; un hash desconocido responde 404; nunca se responde 500 por un duplicado.
- **Seguridad del borde**: HTTPS (terminación en el borde), restricción por IP y, opcionalmente, `x-api-key`.
- **Sin cambios en las APIs existentes**: no se modifican `/api/prescriptions` ni `/api/modules/recetas`; el nuevo servicio solo agrega rutas, campos internos e índices.

## Capabilities

### New Capabilities
- `prescription-praxis-events`: recepción idempotente de los eventos de ciclo de vida que Praxis envía a RecetAr (prescripción emitida, anulaciones, dispensa y anulación de dispensa), con resolución por hash y efecto sobre el estado de las recetas.

### Modified Capabilities
- `prescription-praxis`: la creación en Praxis registra `hash`, `recetasEmitidas[]` y `mensajes[]`, envía `idAtencion` y solicita la cantidad de recetas posdatadas del tratamiento prolongado.
- `prescription-external-identifiers`: se agrega el identificador externo del hash de receta de Praxis y se precisa el uso del hash de prescripción.
- `prescription-management-api`: la receta anulada por Praxis se expone como `eliminada` y deja de estar disponible para SIFAHO; la dispensa registra el número de autorización y el sistema de origen.

## Impact

- **recetar-api**:
  - Nuevo módulo/rutas inbound en `src/` (controller, service, repository o inbox, DTOs, mapper, errores, OpenAPI).
  - Modelo `prescription`: identificadores `praxis` y `praxis-receta`, metadata de receta (`idReceta`, `numeroReceta`, `cuirs`, `contenidoQR`), campos de dispensa (`numeroAutorizacion`) e índices.
  - Integración `src/integrations/praxis/`: tipos reales de request/response, parseo de `mensajes[]`, envío de `idAtencion`/`recetas`, persistencia de hashes en el flujo de creación y en el job de sincronización.
  - Tests de módulo, integración de rutas, idempotencia y contrato; OpenAPI y documentación.
- **Praxis**: se confirma el contrato v2 de QA; producción requiere configurar la URL base de nuestro servicio (`https://<host>/api/praxis`) y los IPs de egreso.
- **SIFAHO**: una receta anulada deja de ofrecerse (`eliminada`); la dispensa de Praxis se ve como dispensada. Sin cambios de contrato para SIFAHO más allá del nuevo valor de estado.
- **ANDES / recetar-app**: sin cambios.
- **Variables de entorno nuevas**: `PRAXIS_INBOUND_ALLOWED_IPS`, `PRAXIS_INBOUND_API_KEY` (opcional), `PRAXIS_INBOUND_ENABLED`.
- **Base de datos**: índices nuevos sobre hash de prescripción y hash de receta; si se decide guardar eventos desconocidos, índice único por evento en la colección de inbox.
- **Fuera de alcance / follow-ups**:
  - `?hash=` obligatorio en PDF y anulación **saliente** de Praxis.
  - Mapeo de `idObraSocial` contra `/api/obras-sociales`, `tipoMatricula` desde `codigoProfesion`, `codigoCIE10` real, `cuit` del prescriptor y `cuil` del paciente (`codigoREFEPS` y `domicilioProfesional` son requeridos próximamente por Praxis).
  - `tipoPrescripcion` `G|M` y genérico/sugerido: se resuelve en `generico-sugerido-praxis`.
  - Creación local de prescripciones originadas exclusivamente en Praxis (hoy el foco es dispensa y anulación).
