# Proposal

## Why

Al implementar el circuito de recetas quedó pendiente cómo RecetAr identifica el producto que envía a Praxys cuando el profesional prescribe un **genérico**. Por ley el médico debe poder recetar por droga (sin fijar marca) y, a la vez, sugerir un comercial. Este change se separó de `circuito-recetas-recetar` (ya archivado) para no bloquear su cierre, y resuelve la selección del **código Alfabeta** con la decisión de producto/Praxys y el vademecum.

## What Changes

- Modelar en la receta un **genérico** (droga + presentación) y un **comercial sugerido**.
- Enviar a Praxys el **código Alfabeta** del producto sugerido (elegido por el profesional o, por defecto, por un criterio — p. ej. menor precio).
- Definir la resolución del código Alfabeta con el vademecum (incluye el mapeo SNOMED/conceptId → droga/alfabeta).

**Incógnitas a resolver con Praxys/vademecum**: si Praxys soporta recetar por droga/genérico y un campo "sugerido"; y el endpoint de mapeo SNOMED→droga/alfabeta.

## Capabilities

### New Capabilities

### Modified Capabilities
- `prescription-praxys`: se agrega el requerimiento de identificación por código Alfabeta de un genérico con sugerido.

## Impact

- **recetar-api**: modelo/DTO `supply`, `PraxysMapper`, integración con vademecum.
- **recetar-app**: selección de genérico + sugerido en la UI de prescripción.
- **Depende de** `circuito-recetas-recetar` (archivado), que ya define la elegibilidad y el envío a Praxys.
