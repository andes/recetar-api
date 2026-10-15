# Tokens de aplicación (sistema-a-sistema)

Autenticación para que sistemas externos (ANDES, SIFAHO, Praxis y futuros) accedan a RecetAr con identidad de aplicación, permisos acotados y tokens revocables.

## Entidad de aplicación

`Application` (`src/modules/applications/`):

| Campo | Descripción |
|---|---|
| `nombre` | Nombre de la aplicación |
| `organizacion` | `{ _id?, nombre? }` (opcional) |
| `permisos[]` | Permisos de la aplicación (formato `resource:action`) |
| `activo` | Si está inactiva, sus tokens no autorizan |
| `token` | Token vigente (permite revocar al reemitir) |

## Endpoints

| Método | Ruta | Protección | Descripción |
|---|---|---|---|
| POST | `/applications` | `checkAuth` + `requirePermission('create:any','application')` | Crear aplicación |
| POST | `/applications/:id/token` | `checkAuth` + `requirePermission('update:any','application')` | Emitir/rotar token |
| GET | `/applications/me` | `checkAppAuth` | Identidad y permisos de la app autenticada |

Las rutas de administración usan el **RBAC de usuarios** (`rbac-recetar`): solo roles con grant sobre `application` (admin, owner).

## Token

JWT HS256 firmado con `JWT_SECRET`:

```json
{
  "iss": "recetar.andes",
  "jti": "<uuid>",
  "app": { "id": "<applicationId>", "nombre": "SIFAHO" },
  "organizacion": { "_id": "...", "nombre": "..." },
  "permisos": ["prescription:read"],
  "isAppToken": true,
  "iat": 0,
  "exp": 0
}
```

Expiración configurable por request (`expiresInHours`) o por variable de entorno `APP_TOKEN_LIFETIME_HOURS` (default 720 h). El `jti` garantiza que cada emisión sea un token distinto.

## Validación y autorización

- `checkAppAuth` (`src/shared/middlewares/app-auth.middleware.ts`): valida el JWT, verifica `isAppToken`, carga la aplicación, exige `activo` y que el token coincida con el **vigente almacenado** (revocable). Expone el principal en `req.user` (`{ type: 'app-token', app, organizacion, permisos }`).
- `requireAppPermission('resource:action')`: autoriza si `permisos` incluye el permiso exacto o un wildcard `resource:*`.

## Revocación

Reemitir el token (`POST /applications/:id/token`) guarda el nuevo como vigente; el anterior deja de autorizar. Alternativa: marcar la aplicación como `inactivo`.

## Convivencia con el mecanismo heredado

El `src-legacy` tenía `generateAppToken` (JWT de un usuario con rol `app`, sin identidad de aplicación ni revocación). El nuevo mecanismo de aplicaciones convive durante la transición:

1. Desplegar aplicaciones (este change) y emitir tokens a ANDES, SIFAHO y Praxis.
2. Migrar cada consumidor al token de aplicación.
3. Retirar el mecanismo heredado (rol `app`) cuando no queden consumidores.

## Uso de `requireAppPermission`

```ts
import { checkAppAuth, requireAppPermission } from '../../shared/middlewares/app-auth.middleware';

const canCreatePrescription = requireAppPermission('prescription:create');
router.post('/ingreso', checkAppAuth, canCreatePrescription, controller.ingest);
```
