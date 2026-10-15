# Spec Delta

## Purpose

Exigir la matrícula del profesional al emitir documentos y enriquecer el snapshot del profesional.

## ADDED Requirements

### Requirement: Emisión requiere matrícula del profesional

RecetAr SHALL rechazar con 422 la creación de recetas, certificados, prácticas e insumos cuando no se resuelva el profesional con su formación/matrícula desde ANDES o el caché, sin persistir el documento.

#### Scenario: Sin matrícula

- **WHEN** se intenta emitir un documento y el profesional no tiene matrícula/formación
- **THEN** RecetAr responde 422 y no crea el documento

#### Scenario: Con matrícula

- **WHEN** el profesional tiene matrícula/formación
- **THEN** RecetAr crea el documento

### Requirement: Snapshot del profesional

RecetAr SHALL incluir `tipoDocumento` y `documento` en el snapshot `professional` de los documentos emitidos, además de `profesionGrado`, `enrollment`, `cuil` y `businessName`.

#### Scenario: Documento emitido

- **WHEN** se emite un documento
- **THEN** el snapshot del profesional incluye tipo y número de documento
