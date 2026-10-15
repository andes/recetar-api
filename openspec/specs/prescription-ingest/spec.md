# prescription-ingest Specification

## Purpose
Define cómo RecetAr recibe y crea recetas originadas en prestaciones de ANDES, en reemplazo de la creación en la colección de recetas de ANDES.

## Requirements

### Requirement: Endpoint interno de ingreso de recetas
RecetAr SHALL exponer un endpoint interno, autenticado con token de aplicación, que reciba la creación de una receta desde una prestación de ANDES en el formato de ANDES.

#### Scenario: Ingreso autenticado
- **WHEN** ANDES envía una creación de receta con un token de aplicación válido
- **THEN** RecetAr acepta y procesa la creación

#### Scenario: Ingreso sin autorización
- **WHEN** llega una creación de receta sin token válido
- **THEN** RecetAr rechaza la request

### Requirement: Adaptación del formato de ANDES
RecetAr SHALL adaptar internamente el formato de receta de ANDES a su modelo, preservando `idPrestacion`, `idRegistro`, paciente, profesional, organización, medicamento (incluyendo `tratamientoProlongado` y `tiempoTratamiento`) y diagnóstico.

#### Scenario: Traducción de campos
- **WHEN** RecetAr recibe una receta en formato ANDES
- **THEN** la receta creada conserva los datos del medicamento, del paciente, del profesional y de la organización

### Requirement: Deduplicación en RecetAr
RecetAr SHALL evitar crear recetas duplicadas para una misma prestación, identificando por `idRegistro` y el concepto SNOMED (o el nombre del magistral).

#### Scenario: Receta ya registrada
- **WHEN** llega una creación para un `idRegistro` y concepto que ya existen
- **THEN** RecetAr no crea una receta duplicada

### Requirement: Tratamiento prolongado desde la prestación
RecetAr SHALL generar, para una receta de tratamiento prolongado, la cantidad de recetas indicada por `tiempoTratamiento`, con orden incremental, fechas escalonadas y la primera vigente y el resto pendientes.

#### Scenario: Prestación con tratamiento prolongado
- **WHEN** el medicamento de la prestación indica tratamiento prolongado de N meses
- **THEN** RecetAr crea N recetas con orden 0..N-1, fechas escalonadas y los estados iniciales correspondientes

### Requirement: ANDES deja de crear recetas nuevas
El evento de prestación de ANDES SHALL delegar la creación de la receta a RecetAr y SHALL dejar de escribir recetas nuevas en su colección local.

#### Scenario: Validación de prestación con medicamento
- **WHEN** ANDES valida una prestación que genera una receta de medicamento
- **THEN** ANDES envía la creación a RecetAr y no persiste la receta en su propia colección
