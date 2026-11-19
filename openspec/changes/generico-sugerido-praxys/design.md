# Design

## Context

Ver `proposal.md - Why`. Este change se separó de `circuito-recetas-recetar` (archivado). El estado relevante:

- La capability `prescription-praxys` (archivada) ya define elegibilidad, envío por insumo y sincronización; el `PraxysMapper` hoy envía el `codigoAlfabeta` que ya viene en el `supply` (producto comercial seleccionado).
- En `medication-adapter.ts` (recetar-app) el comercial ya emite `code.source='ALFABETA'` con `value = vademecum.id` y `barCode = codigoDeBarras[0]`.
- El modelo/DTO `supply` **no** distingue genérico de sugerido; el genérico (droga/SNOMED) no se persiste como tal.

## Goals / Non-Goals

**Goals:**
- Persistir genérico (droga + presentación) y comercial sugerido.
- Resolver y enviar a Praxys el código Alfabeta del sugerido.

**Non-Goals:**
- Cambiar la elegibilidad o el flujo de sincronización (ya definidos en `prescription-praxys`).
- Implementar en ANDES (no aplica).

## Decisions

- **Modelado de genérico + sugerido en `supply`.** Agregar campos para el genérico (droga, presentación) y el sugerido (producto vademecum). Alternativa: mantener un único producto; se descarta porque el requisito legal exige prescribir por droga y sugerir marca.
- **Código enviado a Praxys = Alfabeta del sugerido** (elegido o por defecto). Alternativa: enviar código de droga/genérico; **bloqueada** por no confirmarse el soporte de Praxys (ver Open Questions).
- **Resolución del código Alfabeta vía vademecum.** Para el genérico se requiere el mapeo SNOMED/conceptId → droga/alfabeta (gap conocido).

## Risks / Trade-offs

- [Praxys no documenta droga/genérico ni "sugerido"] → aislar el mapper para cambiarlo cuando se confirme; por defecto enviar el sugerido.
- [Mapeo SNOMED→alfabeta inexistente] → depende de un endpoint del vademecum; puede demorar la implementación.
- [Criterio por defecto del sugerido] → definir "menor precio" y dónde se resuelve (API vs app).

## Open Questions

- ¿Praxys soporta recetar por droga/genérico y un campo "sugerido"? (spike con Praxys)
- Mapeo SNOMED/conceptId → droga/alfabeta (endpoint del vademecum).
- Criterio por defecto del sugerido (menor precio) y en qué capa se elige.
