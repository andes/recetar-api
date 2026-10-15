# prescription-external-identifiers Specification

## Purpose
Define cómo RecetAr almacena y consulta los identificadores que los sistemas externos asignan o esperan para una receta, de modo que la receta pueda vincularse con Praxis, con la prestación de origen y con la HUDS.

## Requirements

### Requirement: Almacenamiento de identificadores externos
RecetAr SHALL almacenar en cada receta un array `identificadoresExternos` de pares `{ entidad, valor }`, donde `entidad` sea `praxis`, `prestacion` o `registro`, persistiendo como máximo una entrada por entidad (upsert).

#### Scenario: Se agrega el identificador de Praxis
- **WHEN** Praxis asigna un identificador a una receta
- **THEN** RecetAr registra una entrada `{ entidad: 'praxis', valor: <idPrescripcion> }` sin duplicar una entrada previa de `praxis`

#### Scenario: Receta originada en una prestación
- **WHEN** la receta se crea a partir de una prestación de ANDES con `idPrestacion` e `idRegistro`
- **THEN** RecetAr registra entradas `prestacion` y `registro` con esos valores

#### Scenario: Reintento no duplica ni pisa
- **WHEN** se reintenta la obtención de un identificador ya presente
- **THEN** RecetAr mantiene una única entrada para esa entidad con el valor vigente

### Requirement: Búsqueda indexada por identificador externo
RecetAr SHALL permitir buscar recetas por un identificador externo mediante un índice multikey compuesto (no único) sobre `identificadoresExternos.entidad` y `identificadoresExternos.valor`, usando `$elemMatch` para acotar la misma entrada.

#### Scenario: Búsqueda por prestación
- **WHEN** se busca una receta por `entidad: 'prestacion'` y su valor
- **THEN** RecetAr devuelve los documentos que contienen esa entrada, usando el índice

#### Scenario: Varios documentos comparten el identificador
- **WHEN** una prestación/registro origina varios documentos (uno por medicamento)
- **THEN** la búsqueda devuelve todos ellos sin que el índice sea único

### Requirement: Orden de recetas de tratamiento prolongado
RecetAr SHALL distinguir los documentos de un tratamiento prolongado que comparten identificadores, mediante un orden (0..n-1) por documento y fechas de registro escalonadas.

#### Scenario: Recetas prolongadas comparten identificadores
- **WHEN** una receta es de tratamiento prolongado con varios meses
- **THEN** los documentos generados comparten los identificadores externos y se distinguen por su orden y fecha de registro
