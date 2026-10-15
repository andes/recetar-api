# Spec Delta

## Purpose

Define la API de recetas de RecetAr como fuente de verdad, compatible con el contrato que hoy exponen ANDES y los sistemas que consumen recetas (HUDS vía ANDES y SIFAHO).

## ADDED Requirements

### Requirement: Contrato de receta compatible con ANDES
RecetAr SHALL exponer, para recetas de medicamento, los endpoints equivalentes a los de ANDES: `GET /recetas`, `GET /recetas/motivos`, `GET /recetas/filtros`, `GET /recetas/profesional/:id`, `GET /recetas/verificar`, `PATCH /recetas` y `POST /recetas`, con el mismo formato de request/response.

#### Scenario: SIFAHO lee recetas
- **WHEN** SIFAHO consulta el endpoint de recetas con un token de aplicación de RecetAr
- **THEN** RecetAr responde con el formato de receta que SIFAHO ya consume

#### Scenario: Suspensión desde la HUDS
- **WHEN** llega `PATCH /recetas` con `op: 'suspender'`
- **THEN** RecetAr actualiza el estado de la receta y responde en el formato esperado

### Requirement: Formato de receta compatible
RecetAr SHALL devolver cada receta con los campos que consumen los clientes actuales, incluyendo `estadoActual.tipo`, `estadoDispensaActual`, el historial `estadosDispensa[]` (con `sistema` y `cancelada`), `dispensa[]`, `medicamento` (concepto/nombre y `ordenTratamiento`) y `idReceta`.

#### Scenario: La HUDS muestra el detalle
- **WHEN** la HUDS obtiene una receta de RecetAr
- **THEN** la receta incluye estado, historial de dispensas y los datos usados para elegir la receta principal

### Requirement: Consulta de estado por prestación
RecetAr SHALL exponer una consulta que, dado un `idPrestacion`, devuelva la lista de recetas de esa prestación con su estado, estado de dispensa e `idReceta`.

#### Scenario: HUDS reconstruye desde la prestación
- **WHEN** ANDES consulta el estado de las recetas por prestación
- **THEN** RecetAr devuelve la lista de recetas de esa prestación con estado y dispensa

### Requirement: Consulta de recetas de un paciente
RecetAr SHALL permitir consultar las recetas de un paciente. Sin parámetro de ámbito SHALL devolver solo las de ámbito público (comportamiento actual de la HUDS); con el parámetro `ambito=todas` SHALL devolver todas las recetas del paciente, públicas y privadas.

#### Scenario: Consulta por defecto (solo públicas)
- **WHEN** la HUDS consulta las recetas de un paciente sin parámetro de ámbito
- **THEN** RecetAr devuelve solo las recetas de ámbito público de ese paciente

#### Scenario: Consulta de todas las recetas
- **WHEN** la consulta incluye `ambito=todas`
- **THEN** RecetAr devuelve todas las recetas del paciente, públicas y privadas

### Requirement: Merge de recetas históricas
RecetAr SHALL permitir que las lecturas de recetas de una prestación integren las recetas nuevas de RecetAr y las históricas que aún viven en ANDES, hasta su migración.

#### Scenario: Prestación con recetas nuevas e históricas
- **WHEN** una prestación tiene recetas creadas en RecetAr y recetas históricas en ANDES
- **THEN** la lectura combinada devuelve ambas con el mismo formato
