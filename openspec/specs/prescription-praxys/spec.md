# prescription-praxys Specification

## Purpose
Define cómo RecetAr publica las recetas de medicamento en Praxys (prescripción electrónica) y cómo maneja la sincronización y sus reintentos sin bloquear la creación local.

## Requirements

### Requirement: Elegibilidad para Praxys
RecetAr SHALL publicar en Praxys únicamente recetas de medicamento que no sean magistrales; las magistrales y otros casos no elegibles se persisten en RecetAr pero no se envían a Praxys.

#### Scenario: Medicamento elegible
- **WHEN** se crea una receta de medicamento no magistral
- **THEN** RecetAr la envía a Praxys

#### Scenario: Magistral no elegible
- **WHEN** se crea una receta magistral
- **THEN** RecetAr la persiste y marca la sincronización con Praxys como `no_aplicable` sin enviarla

### Requirement: Envío por insumo con tratamiento prolongado
RecetAr SHALL enviar a Praxys una petición por cada medicamento de la receta, marcando `tratamientoProlongado` cuando corresponda, y SHALL registrar el identificador devuelto.

#### Scenario: Receta con un medicamento
- **WHEN** se crea una receta con un medicamento
- **THEN** RecetAr realiza una petición a Praxys y guarda el `idPrescripcion` en los identificadores externos de la receta

#### Scenario: Tratamiento prolongado
- **WHEN** la receta es de tratamiento prolongado
- **THEN** RecetAr envía `tratamientoProlongado` verdadero y comparte el `idPrescripcion` entre los documentos de los meses

### Requirement: Sincronización local-first con reintento
RecetAr SHALL persistir la receta localmente antes de enviarla a Praxys; si el envío falla, SHALL marcar el estado de sincronización como `pendiente`, reintentar mediante un job cada 15 minutos hasta 3 intentos, y luego marcar `error`.

#### Scenario: Falla transitoria
- **WHEN** el envío a Praxys falla por un error transitorio
- **THEN** RecetAr conserva la receta local y deja su sincronización en `pendiente` para reintento

#### Scenario: Reintento exitoso
- **WHEN** el job vuelve a intentar y Praxys responde correctamente
- **THEN** RecetAr guarda el identificador y marca la sincronización como `ok`

#### Scenario: Reintentos agotados
- **WHEN** se superan 3 intentos sin éxito
- **THEN** RecetAr marca la sincronización como `error` y deja de reintentar
