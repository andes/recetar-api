# Proposal

## Why

Durante la migración a `src/` se perdió el RBAC del legacy (`hasPermissionIn` + grants con `accesscontrol`): hoy las ~94 rutas de los 13 módulos usan solo `checkAuth`, de modo que **cualquier usuario autenticado puede ejecutar cualquier acción**. Además hay chequeos de rol rotos (por ejemplo `req.user?.role === 'admin'` en `prescription.controller.ts`, que nunca es verdadero porque `checkAuth` solo expone `_id`). Se necesita autorización granular por rol para dejar de exponer operaciones sensibles.

## What Changes

- `checkAuth` expone en `req.user` los **roles** (y permisos) del usuario, además del `_id`.
- Nuevo middleware de autorización `requirePermission(action, resource)` con **grants definidos en código** (puerto del legacy con `accesscontrol`), que permite/deniega según los roles del usuario.
- Aplicar el middleware a las rutas de cada módulo según su recurso (`prescription`, `patient`, `supplies`, `user`, `role`, etc.).
- Semántica `Any` vs `Own` (por ejemplo `read:own` vs `read:any`).
- Arreglar los chequeos de rol rotos en controllers/services.
- Seed de roles de la aplicación.
- Respuesta **403** (formato de error unificado) ante acceso denegado.

## Capabilities

### New Capabilities
- `role-authorization`: control de acceso de usuarios a las rutas según su rol, con granularidad por acción (create/read/update/delete) y recurso, incluyendo alcance `Any`/`Own`.

### Modified Capabilities

## Impact

- **recetar-api**: `shared/middlewares` (autorización), `shared/middlewares/auth.middleware.ts` (`checkAuth`), rutas de los 13 módulos, seed de roles, tests.
- **Consumidores**: los frontends y las apps de sistema pasan a recibir 403 en operaciones no permitidas por su rol.
- Es **prerrequisito** de `app-tokens-recetar` para proteger el endpoint de administración por rol `admin`.
- Convivencia con el RBAC del legacy (referencia): se replica el modelo de grants en código.
