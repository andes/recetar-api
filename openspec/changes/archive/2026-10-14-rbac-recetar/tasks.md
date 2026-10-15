# Tasks

## 1. Identidad y roles en la request

- [x] 1.1 Enriquecer `checkAuth` para cargar y exponer los roles del usuario en la request (además del `_id`) y verificar con test (usuario con roles → roles disponibles; token inválido → 401)
- [x] 1.2 Definir el tipo del principal en la request (`{ _id, roles, permisos? }`) y verificar que los módulos que hoy leen `req.user` siguen compilando (`npm run build`)

## 2. Configuración de grants y middleware

- [x] 2.1 Crear el archivo de grants en código (roles × recurso × acción × alcance), portando el legacy, y verificar con test unitario del evaluador (`can(roles)` para casos Any/Own)
- [x] 2.2 Implementar el middleware `requirePermission(action, resource)` que responde 403 con `ForbiddenError` cuando falta el permiso, y verificar con test (permiso presente permite, ausente 403)

## 3. Aplicación a las rutas

- [x] 3.1 Aplicar `requirePermission` a las rutas de `prescriptions` según recurso/acción y verificar con tests de autorización por rol (professional, pharmacist, admin)
- [x] 3.2 Aplicar `requirePermission` a las rutas de `patients`, `supplies`, `practices`, `certificates` y verificar con tests de autorización
- [x] 3.3 Aplicar `requirePermission` a las rutas de `users`, `professionals`, `pharmacists`, `pharmacies` y verificar con tests de autorización
- [x] 3.4 Revisar las rutas restantes (`stock`, `documents`, `security`) y dejarlas con `checkAuth` o `requirePermission` según sensibilidad, y verificar con tests

## 4. Correcciones y roles

- [x] 4.1 Arreglar los chequeos de rol rotos (`prescription.controller.ts` y `users.service.ts`) para usar `req.user.roles` y verificar con tests de los flujos afectados
- [x] 4.2 Crear el seed idempotente de roles del sistema y verificar que ejecutarlo dos veces no duplica roles

## 5. Documentación y verificación

- [x] 5.1 Documentar los recursos/acciones por rol y el uso de `requirePermission` en la documentación del proyecto, y verificar que la referencia coincide con los grants
- [x] 5.2 Verificar la suite completa de `recetar-api` (`npm run lint`, `npm run build`, `npm test`) y registrar el resultado

## Workflow follow-up

- Archivar el change cuando se cumplan los requisitos de revisión del proyecto.
- Verificar el resultado archivado.
