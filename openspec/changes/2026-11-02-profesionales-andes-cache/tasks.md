# Tasks

## 1. Modelos

- [x] 1.1 Quitar `profesionGrado`, `enrollment`, `firstName`, `lastName`, `razonSocial` de `users`
- [x] 1.2 Crear el esquema de `professionals` como caché (`userId`, `tipoDocumento`, `documento`, `nombre`, `apellido`, `sexo`, `cuit`, `profesionGrado`, `actualizadoEn`)

## 2. Sync y perfil

- [x] 2.1 Mapear `tipoDocumento`/`sexo` desde ANDES en `SyncableProfessional`
- [x] 2.2 `ProfessionalService` con `saveFromAndes`, `refresh` y `requireForUser` (422)
- [x] 2.3 Login: upsert del caché y dejar de escribir formación en `users`
- [x] 2.4 `GET /professionals/me` y retiro del CRUD legacy
- [x] 2.5 Quitar `fields` de la consulta a ANDES (devuelve documento completo) y `/me` con fallback (`getOrRefresh`)
- [x] 2.6 Mantener `cuit` (nombre que usa ANDES) en el caché y asignar el valor que devuelve ANDES al profesional

## 3. Emisión de documentos

- [x] 3.1 `PrescriptionService.create` exige perfil profesional (422) y arma el snapshot
- [x] 3.2 `CertificateService.create` y `PracticeService.create` idem
- [x] 3.3 Agregar `tipoDocumento`/`documento` al snapshot `professional` de los tres documentos

## 4. Verificación

- [x] 4.1 Tests: perfil (cache/422), sync login, emisión
- [x] 4.2 `npm run lint`, `npm run build`, `npm test`
- [x] 4.3 OpenAPI de profesionales actualizado

## 5. Autogestión de cuenta

- [x] 5.1 `PATCH /users/me` con `update:own` y DTO restringido (email/username/businessName); la app usa `/users/me` para editar la cuenta
- [x] 5.2 Test: profesional edita su `businessName` (200); `roles`/`isActive` se ignoran en autogestión

## 6. Logs

- [x] 6.1 `devLogger` compartido (info/warn solo en dev; errores siempre) y `NODE_ENV=development` en nodemon
- [x] 6.2 Quitar logs de debug `[sync]`, `[matriculas]`, `[req]`, `[professional] refresh`
- [x] 6.3 Logs operativos (arranque/DB/agenda) gateados por `isDev`; `console.error` críticos siempre

## Workflow follow-up

- Archivar el change cuando se cumplan los requisitos de revisión del proyecto.
- Verificar el resultado archivado.
