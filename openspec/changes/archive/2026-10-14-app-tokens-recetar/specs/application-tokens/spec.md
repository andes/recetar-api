# Spec Delta

## Purpose

Permite que sistemas externos (ANDES, SIFAHO, Praxis y futuros) accedan a RecetAr con identidad de aplicación, permisos acotados y tokens revocables, en reemplazo del mecanismo heredado basado en usuarios con rol `app`.

## ADDED Requirements

### Requirement: Registro de aplicaciones
RecetAr SHALL mantener un registro de aplicaciones con `nombre`, `organizacion`, `permisos[]`, `activo` y el token vigente asociado.

#### Scenario: Alta de aplicación
- **WHEN** un administrador crea una aplicación con nombre, organización y permisos
- **THEN** RecetAr persiste la aplicación como activa y con su conjunto de permisos

#### Scenario: Aplicación inactiva
- **WHEN** una aplicación está marcada como inactiva
- **THEN** sus tokens dejan de autorizar el acceso

### Requirement: Emisión de token de aplicación
RecetAr SHALL emitir un token firmado que identifique a la aplicación, su organización y sus permisos, con una expiración configurable.

#### Scenario: Emisión exitosa
- **WHEN** un administrador solicita un token para una aplicación activa
- **THEN** RecetAr devuelve un token firmado con la identidad y los permisos de esa aplicación

#### Scenario: Aplicación inexistente o inactiva
- **WHEN** se solicita un token para una aplicación inexistente o inactiva
- **THEN** RecetAr rechaza la solicitud sin emitir token

### Requirement: Validación y revocación de token de aplicación
RecetAr SHALL validar cada token de aplicación contra el token vigente almacenado para esa aplicación, de modo que emitir uno nuevo revoque al anterior.

#### Scenario: Token vigente
- **WHEN** una aplicación presenta su token vigente en una request
- **THEN** RecetAr acepta la autenticación de la aplicación

#### Scenario: Token revocado
- **WHEN** una aplicación presenta un token distinto al vigente almacenado
- **THEN** RecetAr rechaza la request con error de no autorizado

### Requirement: Autorización por permisos de aplicación
RecetAr SHALL autorizar el acceso de una aplicación únicamente a las operaciones cubiertas por sus permisos.

#### Scenario: Permiso presente
- **WHEN** una aplicación invoca una operación incluida en sus permisos
- **THEN** RecetAr permite la operación

#### Scenario: Permiso ausente
- **WHEN** una aplicación invoca una operación no incluida en sus permisos
- **THEN** RecetAr rechaza la operación con error de prohibido
