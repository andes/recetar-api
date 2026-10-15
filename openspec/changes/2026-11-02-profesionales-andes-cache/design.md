# Design

## Context

- ANDES es la fuente de la formación del profesional (`/core/tm/profesionales`, `formacionGrado`).
- `users` guardaba `profesionGrado`/`enrollment`, lo que mezcla cuenta con profesional y quedaba vacío en producción.
- Los documentos emitidos ya persisten `professional.profesionGrado` (snapshot de producción) y no deben romperse.

## Goals / Non-Goals

**Goals:**

- Separar usuario (cuenta) de profesional (ANDES).
- Cachear el perfil profesional para no consultar ANDES en cada operación.
- Bloquear la emisión de cualquier documento sin matrícula/formación (422).

**Non-Goals:**

- Renombrar el snapshot `professional.profesionGrado` de los documentos existentes.
- CRUD de profesionales en la app (tarea aparte).

## Decisions

- **`professionals` como caché**: `userId` único (vínculo al usuario), `documento` único (DNI), `tipoDocumento`, `nombre`, `apellido`, `sexo`, `cuit`, `profesionGrado`, `actualizadoEn`. La fuente sigue siendo ANDES.
- **Refresh**: en login (best-effort, no bloquea el acceso). En emisión, si no hay caché, se consulta ANDES (fallback). Si aun así no hay matrícula → `ProfessionalFormationRequiredError` (422).
- **`users` sin datos profesionales**: se quitan `profesionGrado`, `enrollment`, `firstName`, `lastName`, `razonSocial`; se conservan `businessName`, `cuil`, roles y organizaciones.
- **Snapshot**: se agregan `tipoDocumento` y `documento` a `professional` en receta/certificado/práctica (aditivo).
- **Endpoint**: `GET /professionals/me` devuelve el perfil cacheado; se retira el CRUD legacy (no lo usa la app).

## Risks / Trade-offs

- [Sin caché si el login falla] → fallback a ANDES en la emisión; si también falla → 422 (no se emite).
- [Usuarios antiguos sin caché] → se completa en el próximo login o en la primera emisión (fallback).
- [Snapshot histórico] → se mantiene el campo `profesionGrado`; solo se agregan `tipoDocumento`/`documento`.
