# Proposal

## Why

RecetAr ya permite emitir documentos para pacientes sin DNI, pero no tiene una API completa para que profesionales y auditores busquen, consulten y editen pacientes con sus datos de contacto y dirección. La búsqueda actual no tiene filtros ni carga incremental, y la actualización solo cubre datos básicos. Necesitamos completar el contrato de gestión de pacientes para habilitar la pantalla de pacientes.

## What Changes

- Agregar búsqueda paginada con término, filtros por estado, sexo, email y teléfono, y carga incremental.
- Exponer y actualizar datos de contacto del paciente: email, celular y teléfono fijo.
- Exponer y actualizar datos de dirección: calle, código postal, barrio, localidad, provincia y país.
- Preservar contactos y direcciones existentes que no se editan.
- Mantener la identificación por `idMPI` y el DNI opcional ya implementados.
- Mantener la validación y eliminación de pacientes ya implementadas.
- Documentar la búsqueda, el mapeo y la actualización completa en OpenAPI.
- **Fuera de alcance**: familiares, foto, notas, documentos adjuntos, cobertura, documento extranjero, migración de datos y cambios en ANDES.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `patient-management-api`: se agregan búsqueda paginada con filtros y gestión de contacto y dirección del paciente.

## Impact

- **recetar-api**: DTO, tipos, mapper, service, controller y rutas de pacientes; OpenAPI y tests.
- **recetar-app**: consume el contrato en la nueva pantalla de pacientes. El change del frontend se documenta en `recetar-app`.
- **ANDES**: se usan los campos `contacto` y `direccion` del MPI; no se modifica ANDES.
- **Datos**: no se migran datos; los campos nuevos se leen y actualizan en ANDES.
- **Dependencia**: se apoya en `emision-sin-dni-api` para pacientes temporales e identificación por `idMPI`.
