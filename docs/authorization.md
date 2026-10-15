# Autorización (RBAC) en recetar-api

## Cómo funciona

- `checkAuth` (`src/shared/middlewares/auth.middleware.ts`) valida el JWT HS256, carga el usuario con `populate('roles')` y expone `req.user.roleNames` (nombres de rol del usuario).
- `requirePermission(action, resource)` (`src/shared/middlewares/permission.middleware.ts`) evalúa los roles del usuario con `accesscontrol` y responde **403** (`ForbiddenError`) si no tiene el grant.
- Los grants viven en código en `src/shared/security/access-control.ts` (decisión: grants en código, no en DB).

### Formato de acción

`create|read|update|delete` + `:any|:own`. En `accesscontrol`, el alcance `:any` implica `:own` (un rol con `read:any` también pasa `read:own`), pero no al revés.

## Uso en rutas

```ts
import { checkAuth } from '../../shared/middlewares/auth.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';

const canCreatePrescription = requirePermission('create:any', 'prescription');

router.post('/', checkAuth, canCreatePrescription, validate(schema), controller.create);
```

Orden recomendado: `checkAuth` → `requirePermission` → `validate` → controlador.

## Roles

`owner`, `admin`, `auditor`, `professional`, `professional-public`, `pharmacist`, `pharmacist-public`. El rol de sistema `andes` se usa para integraciones. Los roles se siembran con `npm run seed:roles` (idempotente).

## Recursos y acciones

| Recurso | Acciones destacadas |
|---|---|
| `user` | `admin`/`auditor`: `create/read/update:any`, `admin`: `delete:any`; profesionales y farmacéuticos: `read:own`/`update:own`; `owner`: `delete:any` |
| `role` | `owner`: `create/read/update/delete:any` |
| `prescription`, `prescriptionPublic`, `practice`, `certificate` | profesionales: `create:any`, `read:any/own`, `update:own`, `delete:any`; farmacéuticos: `read:any`, `update:any`; `admin`: `create/read/update/delete:any`; `auditor`/`owner`: `read:any`; `owner`: `delete:any` |
| `patient` | profesionales: `create/read/update/delete:any`, `read:any/own`; auditores: `read/update/delete:any`; farmacéuticos: `read:any`; `admin`: `create/read/update:any`; `owner`: `read/delete:any` |
| `supplies` | roles operativos: `read:any`; `admin`: `create/read/update/delete:any`; `owner`: `read:any`, `delete:any` |
| `stock` | roles operativos y `admin`/`auditor`: `read:any` |
| `document` | roles operativos, `admin`/`auditor`/`owner`: `read:any` |
| `andesPrescription` | `andes`: `create:any` |

## Rutas públicas

Algunas rutas quedan deliberadamente sin autorización (solo acceso público o solo `checkAuth`):

- `GET /practices/:id` y `GET /certificates/:id`: **públicas por diseño** (verificadas por test).
- Rutas `/security/me/*` y `/users/me/*`: solo `checkAuth` (operan sobre el propio usuario).

## Agregar autorización a una ruta nueva

1. Identificar el recurso y la acción.
2. Definir el middleware con `requirePermission('<action>', '<resource>')`.
3. Insertarlo entre `checkAuth` y la validación/controlador.
4. Si se introduce un recurso nuevo, agregar los grants en `src/shared/security/access-control.ts`.
5. Agregar un test de autorización (rol permitido y rol denegado con 403).
