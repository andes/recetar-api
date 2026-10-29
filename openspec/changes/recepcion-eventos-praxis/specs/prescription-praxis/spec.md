# Spec Delta

## MODIFIED Requirements

### Requirement: Envío por insumo con tratamiento prolongado
RecetAr SHALL enviar a Praxis una petición por cada medicamento de la receta, incluyendo `idAtencion` como identificador de correlación y, en tratamientos prolongados, la cantidad de recetas y los días entre recetas, para que Praxis emita una receta por mes.

#### Scenario: Receta con un medicamento
- **WHEN** se crea una receta con un medicamento
- **THEN** RecetAr realiza una petición a Praxis con su `idAtencion` y guarda los identificadores devueltos

#### Scenario: Tratamiento prolongado
- **WHEN** la receta es de tratamiento prolongado de N meses
- **THEN** RecetAr envía `tratamientoProlongado` verdadero, `recetas.cantidadRecetas = N` y `recetas.cantidadDiasEntreRecetas = 30`

#### Scenario: Menos recetas emitidas que meses
- **WHEN** Praxis emite menos recetas que meses locales por una política
- **THEN** RecetAr registra las recetas emitidas y deja constancia de las que no tienen hash

## ADDED Requirements

### Requirement: Registro de hashes y recetas emitidas
RecetAr SHALL persistir el `hash` de prescripción y, por cada receta emitida, su `hash`, `idReceta`, `numeroReceta`, `cuirs` y `contenidoQR`, vinculándolos a los documentos locales por orden de tratamiento.

#### Scenario: Prescripción simple
- **WHEN** Praxis devuelve una prescripción con una receta
- **THEN** RecetAr guarda el hash de prescripción y el hash de esa receta en el documento local

#### Scenario: Tratamiento prolongado
- **WHEN** Praxis devuelve N recetas emitidas para un tratamiento de N meses
- **THEN** RecetAr guarda cada hash de receta en el documento del mes correspondiente según `ordenTratamiento`

### Requirement: Interpretación de mensajes de Praxis
RecetAr SHALL interpretar los `mensajes[]` de la respuesta de Praxis y SHALL considerar fallido el envío cuando haya un mensaje de severidad `E`, conservando la receta local y el estado de sincronización pendiente.

#### Scenario: Error informado por Praxis
- **WHEN** la respuesta de Praxis incluye un mensaje de severidad `E`
- **THEN** RecetAr no marca la sincronización como exitosa y deja la receta pendiente para reintento

#### Scenario: Aviso sin error
- **WHEN** la respuesta de Praxis solo incluye mensajes de severidad `A` o `I`
- **THEN** RecetAr completa la sincronización y registra los hashes devueltos
