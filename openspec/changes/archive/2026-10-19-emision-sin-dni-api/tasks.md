# Tasks

## 1. Pacientes en ANDES MPI

- [x] 1.1 Permitir DNI opcional en el alta y exigir nombre, apellido y sexo cuando no haya DNI, y verificar con tests de DTO
- [x] 1.2 Extender los tipos y el mapper de ANDES para documento opcional y creación de paciente temporal, y verificar con tests del mapper/servicio
- [x] 1.3 Implementar el alta de paciente sin DNI con estado `temporal` y verificar con test del servicio
- [x] 1.4 Resolver el paciente por `idMPI` y permitir búsquedas de pacientes validados y temporales, y verificar con tests del servicio
- [x] 1.5 Implementar el agregado posterior de DNI con control de duplicados, validación por id y eliminación en ANDES, y verificar con tests del servicio
- [x] 1.6 Exponer validación por id y eliminación en controller/rutas y ampliar permisos de profesionales y auditores, y verificar con tests de permisos/controlador

## 2. Documentos clínicos sin DNI

- [x] 2.1 Permitir DNI opcional y resolución por `idMPI` en recetas, y verificar con tests de DTO/servicio
- [x] 2.2 Permitir DNI opcional y resolución por `idMPI` en prácticas, y verificar con tests de DTO/servicio
- [x] 2.3 Permitir DNI opcional y resolución por `idMPI` en certificados, y verificar con tests de DTO/servicio
- [x] 2.4 Consultar documentos recientes por `patient.idMPI` cuando no haya DNI, y verificar con tests de repositorios/rutas

## 3. Documentación y contrato

- [x] 3.1 Actualizar `patients.openapi.yaml`, los OpenAPI de documentos y `docs/authorization.md`, y verificar que reflejen DNI opcional, `idMPI`, validación y eliminación

## 4. Verificación

- [x] 4.1 Ejecutar `npm run build`, `npm run lint` y `npm test` en `recetar-api`, y registrar el resultado (643 tests aprobados)
- [x] 4.2 Validar el change con `openspec validate emision-sin-dni-api --strict`

## Workflow follow-up

- Archivar el change cuando se cumplan los requisitos de revisión del proyecto.
- Verificar el resultado archivado con `openspec list --specs --json` y `openspec validate --specs --strict`.
