# Spec Delta

## Purpose

Definir el perfil del profesional cacheado desde ANDES y ligado al usuario.

## ADDED Requirements

### Requirement: Caché del perfil del profesional

RecetAr SHALL almacenar un perfil de profesional por usuario con `userId`, `tipoDocumento`, `documento`, `nombre`, `apellido`, `sexo`, `cuit`, `profesionGrado` y `actualizadoEn`, obtenido desde ANDES, y SHALL refrescarlo en el login.

#### Scenario: Login de profesional

- **WHEN** un profesional inicia sesión
- **THEN** RecetAr consulta ANDES y actualiza el perfil cacheado con su formación

#### Scenario: Fallback al emitir

- **WHEN** no existe perfil cacheado al emitir un documento
- **THEN** RecetAr consulta ANDES antes de continuar

### Requirement: Consulta del perfil

RecetAr SHALL exponer `GET /professionals/me` con el perfil del profesional logueado.

#### Scenario: Perfil disponible

- **WHEN** el profesional logueado consulta su perfil
- **THEN** RecetAr devuelve su formación y matrículas cacheadas
