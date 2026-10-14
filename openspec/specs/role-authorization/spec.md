# role-authorization Specification

## Purpose
Controla el acceso de los usuarios a las operaciones de RecetAr según su rol, con granularidad por acción y recurso y alcance `Any`/`Own`, evitando que cualquier usuario autenticado pueda ejecutar cualquier acción.

## Requirements

### Requirement: Autenticación expone roles del usuario
`checkAuth` SHALL dejar disponible en la request la identidad del usuario y sus roles, además del identificador, para que la autorización pueda evaluarlos.

#### Scenario: Usuario autenticado con roles
- **WHEN** un usuario con roles válidos presenta un token correcto
- **THEN** la request queda con su identidad y sus roles disponibles para los middlewares de autorización

#### Scenario: Token inválido o ausente
- **WHEN** la request no presenta token válido
- **THEN** RecetAr responde 401 sin evaluar autorización

### Requirement: Autorización por acción y recurso
RecetAr SHALL exponer un middleware `requirePermission(action, resource)` que permita la operación solo si alguno de los roles del usuario tiene un grant que cubra esa acción sobre ese recurso.

#### Scenario: Permiso presente
- **WHEN** un usuario con un rol que incluye `update:any` sobre `prescription` invoca una operación protegida con `requirePermission('update:any', 'prescription')`
- **THEN** RecetAr permite la operación

#### Scenario: Permiso ausente
- **WHEN** un usuario sin el grant requerido invoca la operación protegida
- **THEN** RecetAr responde 403 con el formato de error unificado

### Requirement: Alcance Any y Own
El middleware SHALL distinguir entre acciones de alcance `Any` (sobre cualquier recurso) y `Own` (solo sobre los recursos del propio usuario).

#### Scenario: Acción Any
- **WHEN** el grant requerido es `read:any` y el rol del usuario lo incluye
- **THEN** RecetAr permite la operación sin restringir por pertenencia

#### Scenario: Acción Own
- **WHEN** el grant requerido es `read:own`
- **THEN** RecetAr solo permite la operación a roles cuyo grant cubra ese alcance propio

### Requirement: Rutas protegidas por recurso
Cada módulo SHALL aplicar el middleware de autorización en sus rutas según el recurso que administra y la acción correspondiente.

#### Scenario: Ruta de receta protegida
- **WHEN** un usuario sin permiso de creación de recetas invoca la creación
- **THEN** RecetAr responde 403

#### Scenario: Operación no sensible
- **WHEN** una ruta está protegida únicamente por autenticación
- **THEN** RecetAr la considera accesible a cualquier usuario autenticado

### Requirement: Roles de la aplicación
RecetAr SHALL contar con los roles del sistema (`owner`, `admin`, `auditor`, `professional`, `professional-public`, `pharmacist`, `pharmacist-public`) disponibles para asignar a usuarios.

#### Scenario: Asignación de rol existente
- **WHEN** se asigna a un usuario un rol del conjunto de roles del sistema
- **THEN** RecetAr acepta la asignación y la autorización evalúa sus grants
