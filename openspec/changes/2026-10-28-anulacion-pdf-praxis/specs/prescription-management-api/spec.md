# Spec Delta

## Purpose

Agregar endpoints neutrales de suspensión y PDF de recetas, y proteger frente al borrado las recetas ya publicadas.

## ADDED Requirements

### Requirement: Suspensión de receta

RecetAr SHALL exponer `PATCH /prescriptions/:id/suspend` para suspender una receta; si está publicada en Praxis, la anulación se realiza de forma interna sin exponer los identificadores externos al consumidor.

#### Scenario: Suspensión de receta publicada

- **WHEN** un consumidor suspende una receta publicada
- **THEN** RecetAr la marca suspendida y la anula internamente, devolviendo un resultado neutral

#### Scenario: Suspensión de receta no publicada

- **WHEN** un consumidor suspende una receta no publicada
- **THEN** RecetAr la suspende localmente

### Requirement: Descarga de PDF de receta

RecetAr SHALL exponer `GET /prescriptions/:id/pdf` para obtener el PDF de una receta. Sin PDF disponible SHALL responder 404/409.

#### Scenario: Descarga exitosa

- **WHEN** un consumidor solicita el PDF de una receta publicada
- **THEN** RecetAr devuelve el PDF en base64

#### Scenario: Receta sin PDF

- **WHEN** un consumidor solicita el PDF de una receta sin PDF disponible
- **THEN** RecetAr responde 404/409

### Requirement: Protección de recetas publicadas frente al borrado

RecetAr SHALL rechazar la eliminación (`DELETE /prescriptions/:id`) de una receta publicada (con identificador externo), devolviendo un error neutral e indicando que debe suspenderse.

#### Scenario: Borrado de receta publicada

- **WHEN** se intenta eliminar una receta publicada
- **THEN** RecetAr rechaza la operación con un error neutral

#### Scenario: Borrado de receta no publicada

- **WHEN** se elimina una receta pendiente no publicada
- **THEN** RecetAr la elimina como hasta ahora

### Requirement: Ocultamiento de identificadores externos

Las respuestas orientadas a la app SHALL omitir `syncExterno` e `identificadoresExternos`, de modo que el consumidor no conozca los identificadores de integración.

#### Scenario: Respuesta neutral

- **WHEN** un consumidor de app lee una receta
- **THEN** la respuesta no incluye `syncExterno` ni `identificadoresExternos`

### Requirement: Validación de ámbito en la creación

RecetAr SHALL rechazar (422) la creación de una receta magistral o de un paciente sin DNI cuando el ámbito sea privado.

#### Scenario: Magistral en privado

- **WHEN** se intenta crear una receta magistral en ámbito privado
- **THEN** RecetAr responde 422

#### Scenario: Paciente sin DNI en privado

- **WHEN** se intenta crear una receta para un paciente sin DNI en ámbito privado
- **THEN** RecetAr responde 422

### Requirement: Estado neutral de publicación

Las respuestas orientadas a app SHALL incluir `estadoPublicacion` (`ok`, `pendiente`, `error`, `no_aplicable` o `desconocido`) y SHALL omitir `syncExterno`, `identificadoresExternos`, `praxisHash` y `praxisRecetas`.

#### Scenario: Receta publicada

- **WHEN** la receta se publicó correctamente
- **THEN** la respuesta expone `estadoPublicacion = ok`

#### Scenario: Receta sin estado

- **WHEN** la receta no tiene información de sincronización
- **THEN** la respuesta expone `estadoPublicacion = desconocido`
