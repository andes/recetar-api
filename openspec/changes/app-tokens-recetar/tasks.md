# Tasks

## 1. Modelo de aplicación

- [x] 1.1 Crear el modelo/schema de aplicación (`nombre`, `organizacion`, `permisos[]`, `activo`, `token`) siguiendo el patrón de módulos de `src/` y verificar con un test de creación/lectura en `tests/`
- [x] 1.2 Crear el repositorio de aplicaciones (alta, búsqueda por id, actualización de token/activo) y verificar con tests de repository

## 2. Emisión de token de aplicación

- [x] 2.1 Implementar el servicio que firma el token con identidad, organización y permisos de la aplicación (expiración configurable) y verificar con test unitario del token emitido
- [ ] 2.2 Exponer el endpoint de administración de alta de aplicación y emisión de token, protegido con el RBAC de usuarios de `rbac-recetar` (rol `admin`), y verificar con test de integración (caso exitoso, app inexistente, app inactiva y sin permiso 403)

## 3. Validación y autorización

- [ ] 3.1 Implementar el middleware de validación que compara el token presentado contra el token vigente almacenado y verificar con test (token vigente aceptado, token revocado rechazado)
- [ ] 3.2 Implementar `requireAppPermission(permiso)` que autoriza según los `permisos[]` de la aplicación (independiente del RBAC de usuarios de `rbac-recetar`) y verificar con test (permiso presente permitido, permiso ausente 403)

## 4. Revocación y convivencia

- [ ] 4.1 Implementar la revocación por reemisión de token y verificar con test que el token anterior deja de autorizar
- [ ] 4.2 Mantener la convivencia con el mecanismo heredado (rol `app`) y documentar en el README de auth el plan de retiro, verificando que el lint y el build pasan (`npm run lint`, `npm run build`)

## 5. Verificación e integración

- [ ] 5.1 Documentar el contrato de autenticación por aplicación (emisión y uso del token) en el OpenAPI del módulo y verificar que la spec generada lo incluye
- [ ] 5.2 Verificar extremo a extremo que un consumidor con token de aplicación accede a un endpoint protegido y que sin token o con token revocado es rechazado

## Workflow follow-up

- Archivar el change cuando se cumplan los requisitos de revisión del proyecto.
- Verificar el resultado archivado.
