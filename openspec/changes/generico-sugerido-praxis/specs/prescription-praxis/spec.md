# Spec Delta

## ADDED Requirements

### Requirement: Identificación por código Alfabeta de un genérico con sugerido
RecetAr SHALL almacenar en la receta un genérico (droga y presentación) y un comercial sugerido, y SHALL enviar a Praxis el código Alfabeta del producto sugerido (elegido por el profesional o por un criterio por defecto).

#### Scenario: Profesional elige el sugerido
- **WHEN** el profesional prescribe un genérico y selecciona un comercial sugerido
- **THEN** RecetAr envía a Praxis el código Alfabeta y código de barras de ese comercial, conservando el genérico en la receta

#### Scenario: Sugerido por defecto
- **WHEN** el profesional prescribe un genérico sin elegir comercial
- **THEN** RecetAr selecciona un comercial sugerido por defecto según el criterio definido y lo envía a Praxis
