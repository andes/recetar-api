# Design

## Context

Ver `proposal.md - Why`. Restricciones relevantes:

- El mecanismo heredado de RecetAr (`src-legacy/controllers/auth.controller.ts`, commit `611034c`) emite un JWT de un usuario con rol `app` (`isAppToken: true`), y `passport` salta la expiración de sesión para esos tokens. El RBAC agrega el rol `app`.
- ANDES (`api/auth/schemas/authApps.ts`) ya tiene un estándar equivalente: entidad `authApps { activo, nombre, organizacion, permisos[], token }`, token tipo `app-token` con `app {id, nombre}`, y `appTokenProtected()` que valida el token contra el guardado en la base.
- El nuevo `src/` de RecetAr usa JWT propio con `checkAuth` y `hasPermissionIn(...)`; las rutas no instancian dependencias (composition root en el `index.ts` de cada módulo).

## Goals / Non-Goals

**Goals:**
- Adoptar en RecetAr un modelo de tokens de aplicación de primera clase, análogo a `authApps` de ANDES.
- Permitir que ANDES, SIFAHO y Praxis se autentiquen sistema-a-sistema con permisos acotados y tokens revocables.

**Non-Goals:**
- Definir el formato de los contratos de recetas (los cubre `circuito-recetas-recetar`).
- Migrar/eliminar de inmediato el mecanismo heredado (se mantiene en convivencia durante la transición).

## Decisions

- **Modelo de aplicación en vez de usuario con rol `app`.** Se crea una entidad de aplicación (`nombre`, `organizacion`, `permisos[]`, `activo`, `token`). Alternativa considerada: reusar el mecanismo heredado (usuario con rol `app`); se descarta por falta de identidad por aplicación, permisos por aplicación y revocación.
- **Token firmado + token vigente almacenado.** Se emite un JWT con la identidad/permisos de la app y se guarda el token vigente en la aplicación; la validación compara contra ese valor, lo que permite revocar emitiendo uno nuevo. Alternativa: JWT stateless sin estado; se descarta porque impide la revocación pedida.
- **Middleware de validación + autorización por permisos.** Se sigue el patrón de ANDES (`appTokenProtected` + `authorizeByToken`): `checkAppAuth` valida el token contra el almacenado y `requireAppPermission(permiso)` autoriza según los `permisos[]` de la aplicación. Es independiente del RBAC de usuarios (`rbac-recetar`), que se usa solo para proteger los endpoints de administración (rol `admin`).
- **Expiración configurable** (parámetro de emisión), con valor por defecto a definir.

## Risks / Trade-offs

- [Convivencia con el mecanismo heredado] → mantener ambos caminos durante la transición y documentar el retiro posterior.
- [Formato de token distinto al de ANDES] → si SIFAHO debe aceptar tokens de RecetAr, se emite un token de RecetAr y SIFAHO cambia URL + token (decisión acordada).
- [Pérdida de sesión si se rota el token] → la revocación es intencional; coordinar la rotación con cada consumidor.

## Migration Plan

0. Contar con `rbac-recetar` desplegado (autorización de usuarios) para proteger los endpoints de administración.
1. Desplegar el mecanismo de aplicaciones en RecetAr (convive con el heredado).
2. Emitir tokens de aplicación para ANDES, SIFAHO y Praxis.
3. Retirar el mecanismo heredado (rol `app`) cuando no queden consumidores usándolo.

## Open Questions

- Valor por defecto de expiración del token de aplicación.
- Si la organización de la aplicación es obligatoria o puede ser nula para apps internas.
