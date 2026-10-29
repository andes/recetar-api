# Spec Delta

## MODIFIED Requirements

### Requirement: Almacenamiento de identificadores externos
RecetAr SHALL almacenar en cada receta un array `identificadoresExternos` de pares `{ entidad, valor }`, donde `entidad` sea `praxis` (hash de prescripción), `praxis-receta` (hash de receta), `prestacion` o `registro`, persistiendo como máximo una entrada por entidad (upsert).

#### Scenario: Se agrega el identificador de Praxis
- **WHEN** Praxis devuelve el hash de la prescripción
- **THEN** RecetAr registra una entrada `{ entidad: 'praxis', valor: <hash de prescripción> }` sin duplicar una entrada previa de `praxis`

#### Scenario: Se agrega el identificador de receta
- **WHEN** Praxis devuelve el hash de una receta emitida
- **THEN** RecetAr registra `{ entidad: 'praxis-receta', valor: <hash de receta> }` en el documento del mes correspondiente

#### Scenario: Tratamiento prolongado con hashes distintos
- **WHEN** una prescripción prolongada emite varias recetas
- **THEN** todos los documentos comparten el hash de prescripción y cada uno tiene su propio hash de receta

#### Scenario: Receta originada en una prestación
- **WHEN** la receta se crea a partir de una prestación de ANDES con `idPrestacion` e `idRegistro`
- **THEN** RecetAr registra entradas `prestacion` y `registro` con esos valores

#### Scenario: Reintento no duplica ni pisa
- **WHEN** se reintenta la obtención de un identificador ya presente
- **THEN** RecetAr mantiene una única entrada para esa entidad con el valor vigente

#### Scenario: Identificador interno de Praxis
- **WHEN** Praxis devuelve el `idPrescripcion` de una prescripción
- **THEN** RecetAr lo conserva en la metadata de sincronización, sin ocupar la entrada `praxis` del array
