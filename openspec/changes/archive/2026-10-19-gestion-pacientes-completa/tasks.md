# Tasks

## 1. Búsqueda paginada

- [x] 1.1 Extender los parámetros de búsqueda con estado, sexo, email, teléfono, desplazamiento y límite, y verificar con tests de DTO/servicio
- [x] 1.2 Implementar la respuesta paginada con `items`, `hasMore`, `offset` y `limit`, y verificar con tests del servicio
- [x] 1.3 Exponer los filtros y la paginación en controller/rutas y verificar con tests de controlador

## 2. Contacto y dirección

- [x] 2.1 Extender los tipos y el mapper de ANDES con contactos y direcciones, y verificar con tests del mapper/servicio
- [x] 2.2 Extender el DTO de actualización con contactos y direcciones, y verificar con tests de DTO
- [x] 2.3 Implementar la fusión de contactos y dirección principal preservando datos no editados, y verificar con tests del servicio
- [x] 2.4 Actualizar el paciente completo en ANDES y devolver el paciente con los datos vigentes, y verificar con tests del servicio/controlador

## 3. Documentación

- [x] 3.1 Actualizar `patients.openapi.yaml` con búsqueda paginada, filtros, contactos y direcciones, y verificar el YAML

## 4. Verificación

- [x] 4.1 Ejecutar `npm run build`, `npm run lint` y `npm test` en `recetar-api`, y registrar el resultado
- [x] 4.2 Validar el change con `openspec validate gestion-pacientes-completa --strict`

## Workflow follow-up

- Archivar el change cuando se cumplan los requisitos de revisión del proyecto.
- Verificar el resultado archivado con `openspec list --specs --json` y `openspec validate --specs --strict`.
