# Proposal

## Why

RecetAr no tiene un mecanismo de autenticación para sistemas externos (ANDES, SIFAHO, Praxis). El mecanismo heredado (`authApps` legacy) emite un JWT de un usuario con rol `app`: no representa una aplicación real, no permite identidad ni permisos por aplicación, su token no es revocable y expira a los 30 días. En el nuevo circuito de recetas, RecetAr pasa a ser la fuente de verdad y varios sistemas deben consumirlo e ingresar recetas, por lo que necesita tokens de aplicación de primera clase. Este change es **prerrequisito** de `circuito-recetas-recetar`.

## What Changes

- Incorporar en RecetAr una entidad de **aplicación** (nombre, organización, permisos, activo), análoga a `authApps` de ANDES.
- Emitir **tokens de aplicación** (JWT firmado) con la identidad y los permisos de la aplicación.
- **Validar** el token contra la aplicación almacenada (token revocable) mediante middleware.
- **Autorizar** por permisos de la aplicación (equivalente a los permisos del sistema ANDES).
- Endpoint de administración para alta/gestión de aplicaciones y emisión de tokens, protegido por el RBAC de usuarios (`rbac-recetar`).
- Convivencia con el mecanismo heredado (rol `app`) durante la transición.

## Capabilities

### New Capabilities
- `application-tokens`: emisión, validación, autorización y revocación de tokens de aplicación para acceso sistema-a-sistema en RecetAr.

### Modified Capabilities

## Impact

- **recetar-api**: nuevo modelo/servicio/middleware/rutas de autenticación de aplicaciones; configuración de expiración de tokens; integración con el middleware de permisos existente.
- **Consumidores**: ANDES (`api`), SIFAHO (equipo externo) y Praxis usarán tokens de aplicación de RecetAr.
- **Convivencia** con el `authApps` heredado (`generateAppToken`, rol `app`) durante la migración.
- **Depende de `rbac-recetar`** para proteger el endpoint de administración (rol `admin`).
- Es prerrequisito de `circuito-recetas-recetar` (ingreso de recetas desde ANDES y consumo por SIFAHO).
