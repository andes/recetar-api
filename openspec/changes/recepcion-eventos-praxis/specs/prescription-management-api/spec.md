# Spec Delta

## ADDED Requirements

### Requirement: Receta anulada no disponible
RecetAr SHALL exponer como `eliminada` una receta anulada por Praxis y SHALL dejar de devolverla en las consultas de recetas disponibles para SIFAHO.

#### Scenario: Anulación notificada
- **WHEN** Praxis anula una receta
- **THEN** la receta se expone con `estadoActual.tipo = 'eliminada'`

#### Scenario: Consulta de recetas disponibles
- **WHEN** SIFAHO consulta recetas por estado vigente o pendiente
- **THEN** la receta anulada no aparece en el resultado

#### Scenario: Anulación de prescripción completa
- **WHEN** Praxis anula una prescripción con varios meses
- **THEN** todos los documentos de esa prescripción se exponen como `eliminada`

### Requirement: Dispensa de Praxis en el formato compatible
RecetAr SHALL reflejar en el formato compatible de receta la dispensa notificada por Praxis, incluyendo `numeroAutorizacion`, los renglones dispensados y el sistema de origen.

#### Scenario: Dispensa visible para SIFAHO
- **WHEN** Praxis notifica una dispensa
- **THEN** la receta devuelve `estadoDispensaActual.tipo = 'dispensada'` y `dispensa[]` con el número de autorización y el sistema `praxis`

#### Scenario: Anulación de dispensa visible
- **WHEN** Praxis anula una dispensa
- **THEN** la receta devuelve `estadoDispensaActual.tipo = 'sin-dispensa'` y la cancelación registrada

#### Scenario: Dispensa parcial visible
- **WHEN** Praxis notifica una dispensa parcial
- **THEN** la receta devuelve `estadoDispensaActual.tipo = 'dispensa-parcial'` con los renglones dispensados
