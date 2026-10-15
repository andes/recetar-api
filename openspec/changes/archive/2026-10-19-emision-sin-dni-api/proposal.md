# Proposal

## Why

RecetAr exige DNI para crear pacientes y emitir recetas, certificados y prácticas. Eso impide atender a pacientes que no tienen DNI, aunque ANDES MPI permite pacientes sin documento y las recetas de ANDES se identifican por el id del paciente en MPI. Necesitamos habilitar la emisión sin DNI manteniendo al paciente como no validado y sin perder la trazabilidad con ANDES.

## What Changes

- Permitir crear un paciente sin DNI con nombre, apellido y sexo; queda en estado `temporal` en ANDES MPI.
- Mantener el alta actual con DNI y validación RENAPER para pacientes validados.
- Permitir que recetas, certificados y prácticas tengan DNI vacío cuando incluyan el `idMPI` del paciente.
- Resolver el paciente por `idMPI` cuando no haya DNI.
- Consultar el historial de documentos recientes por `idMPI` cuando no haya DNI.
- Permitir agregar el DNI más adelante, validarlo con RENAPER y persistir el estado `validado`, bloqueando duplicados.
- Agregar validación por id y eliminación de paciente contra ANDES.
- Ampliar los permisos de profesionales y auditores para actualizar y eliminar pacientes.
- Incluir pacientes temporales en las búsquedas de pacientes.

## Capabilities

### New Capabilities

- `patient-management-api`: gestión de pacientes en ANDES MPI y su identificación en documentos clínicos, incluyendo alta sin DNI, resolución por `idMPI`, validación, eliminación y permisos asociados.

### Modified Capabilities

_(ninguna)_

## Impact

- **recetar-api**: módulo `patients` (DTO, service, controller, rutas), integración ANDES (tipos, mapper, cliente), DTO/modelos de recetas, certificados y prácticas, documentos recientes, permisos RBAC y OpenAPI.
- **recetar-app**: consume el contrato para crear pacientes sin DNI, emitir documentos sin DNI, mostrar “Sin DNI” y consultar historial por `idMPI`. El change del frontend se documenta en `recetar-app`.
- **ANDES**: se usa el MPI existente; no se modifica ANDES. La eliminación requiere el permiso `mpi:paciente:deleteAndes` en el token de aplicación.
- **Datos**: no se migran datos existentes. Los pacientes sin DNI quedan como `temporal` y no se validan con RENAPER hasta que se cargue un DNI.
- **Fuera de alcance**: pantalla completa de gestión de pacientes, edición de contacto/dirección y flujo legacy `/profesionales/recetas/nueva`.
