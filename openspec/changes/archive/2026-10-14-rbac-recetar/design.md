# Design

## Context

Ver `proposal.md - Why`. Estado relevante:

- `checkAuth` (`src/shared/middlewares/auth.middleware.ts`) valida el JWT y hace `User.findById(payload.sub).select('_id')`; no expone roles.
- El token ya incluye `rl` (roles) al firmarse (`auth.service.ts` `signToken`), pero `checkAuth` lo ignora.
- Models `Role { role, users, permissions }` y `Permission { resource, action, attributes, roles }` existen pero no se usan en lógica.
- El legacy (`src-legacy/middlewares/roles.middleware.ts` + `utils/rbac_abac.ts`) resolvía con `accesscontrol` y grants hardcodeados, aplicados en `routes/private.ts`.
- Roles: `owner`, `admin`, `auditor`, `professional`, `professional-public`, `pharmacist`, `pharmacist-public`.

## Goals / Non-Goals

**Goals:**
- Restaurar autorización granular por rol para usuarios en `src/`.
- Exponer identidad y roles en la request.
- Proteger las rutas por acción y recurso con alcance `Any`/`Own`.

**Non-Goals:**
- Administración dinámica de permisos por UI/DB (los grants viven en código).
- Definir los permisos de aplicaciones (los cubre `app-tokens-recetar`).
- Reescribir la lógica de negocio de los recursos.

## Decisions

- **Grants en código (no en la DB).** Se porta el modelo del legacy: `accesscontrol` con una lista `{ role, resource, action, attributes }` en un archivo de configuración. Alternativa considerada: usar los modelos `Role`/`Permission` con seed y administración por DB; se descarta por mayor complejidad (seed, caché, consistencia, endpoints admin) y porque no hay requerimiento de administración dinámica. El conjunto de roles es fijo.
- **`checkAuth` carga los roles desde la DB** (populate de `roles`) en lugar de confiar en `rl` del token, para reflejar cambios de rol sin esperar la expiración del token. Alternativa: leer `rl` del token (más rápido pero con roles potencialmente obsoletos).
- **Middleware `requirePermission(action, resource)`** que evalúa `accessControl.can(roles)[action](resource).granted`. Se adjunta por ruta, igual que en el legacy. `action` usa el formato `create|read|update|delete` + `Any|Own`.
- **Recursos consistentes con el legacy** (`user`, `role`, `prescription`, `prescriptionPublic`, `patient`, `supplies`), mapeados por módulo.
- **Errores 403** con `ForbiddenError` (formato de error unificado).
- **Seed de roles** idempotente para garantizar el conjunto de roles del sistema.

## Risks / Trade-offs

- [Aplicar autorización a ~94 rutas puede romper flujos existentes] → aplicar por módulo y verificar con tests de cada módulo; mantener rutas no sensibles con solo `checkAuth`.
- [Roles obsoletos si se leen del token] → se cargan desde DB (decisión anterior).
- [Nombres/recursos inconsistentes con el legacy] → partir de la lista de grants del legacy y documentar el mapeo.
- [Semántica `Own`] → el legacy evaluaba `read:own` a nivel de rol, sin verificar pertenencia real en el middleware; en este change se mantiene la misma semántica (rol), y la verificación de pertenencia queda como open question.
- [Dependencia del token de aplicación] → el RBAC de usuarios es independiente; la protección del endpoint admin de apps la hace `app-tokens-recetar` usando `requirePermission`/rol admin.

## Migration Plan

1. Enriquecer `checkAuth` con roles y agregar `requirePermission` (sin aplicar aún).
2. Crear el seed de roles y ejecutarlo.
3. Aplicar el middleware módulo por módulo, verificando tests.
4. Arreglar los chequeos de rol rotos.
5. Desplegar; los consumidores pasan a recibir 403 donde corresponda.

## Open Questions

- Si `Own` debe verificar pertenencia real (p. ej. que el recurso sea del usuario) o alcanza con la semántica por rol como en el legacy.
- Lista definitiva de recursos/acciones por rol (puede requerir ajuste con producto).
