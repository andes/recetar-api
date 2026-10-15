# Spec Delta

## Purpose

Permite gestionar pacientes en ANDES MPI y usarlos en documentos clínicos aunque no tengan DNI, preservando la trazabilidad por identificador de MPI y el estado de validación.

## ADDED Requirements

### Requirement: Alta de paciente con DNI
RecetAr SHALL crear o reutilizar un paciente con DNI validándolo con RENAPER a través de ANDES y SHALL persistirlo en ANDES con estado `validado`.

#### Scenario: Paciente nuevo con DNI
- **WHEN** se da de alta un paciente con DNI y RENAPER devuelve sus datos
- **THEN** RecetAr crea el paciente en ANDES con estado `validado` y devuelve su identificador de MPI

#### Scenario: Paciente existente con DNI
- **WHEN** se da de alta un paciente cuyo DNI ya existe en ANDES
- **THEN** RecetAr reutiliza el paciente existente sin crear un duplicado

### Requirement: Alta de paciente sin DNI
RecetAr SHALL permitir crear un paciente sin DNI cuando se informen nombre, apellido y sexo. El paciente SHALL crearse en ANDES MPI con estado `temporal` y sin documento, y SHALL quedar identificado como no validado.

#### Scenario: Alta sin DNI válida
- **WHEN** se da de alta un paciente con nombre, apellido y sexo pero sin DNI
- **THEN** RecetAr lo crea en ANDES con estado `temporal`, sin documento y devuelve su identificador de MPI

#### Scenario: Alta sin DNI incompleta
- **WHEN** se intenta dar de alta un paciente sin DNI y falta nombre, apellido o sexo
- **THEN** RecetAr rechaza el alta con un error de validación claro

#### Scenario: Sin validación RENAPER
- **WHEN** el paciente se crea sin DNI
- **THEN** RecetAr no ejecuta la validación RENAPER y el paciente permanece como no validado

### Requirement: Identificación del paciente en documentos clínicos
RecetAr SHALL aceptar DNI vacío en recetas, certificados y prácticas cuando el documento incluya el identificador de MPI del paciente. SHALL exigir al menos DNI o identificador de MPI y SHALL guardar el snapshot del paciente con nombre, apellido, sexo, estado e identificador de MPI.

#### Scenario: Receta sin DNI
- **WHEN** se crea una receta para un paciente sin DNI pero con identificador de MPI
- **THEN** RecetAr guarda la receta con DNI vacío, el identificador de MPI y los datos del paciente

#### Scenario: Certificado o práctica sin DNI
- **WHEN** se crea un certificado o una práctica para un paciente sin DNI pero con identificador de MPI
- **THEN** RecetAr guarda el documento con DNI vacío y el identificador de MPI del paciente

#### Scenario: Documento sin identificación
- **WHEN** se intenta crear un documento sin DNI y sin identificador de MPI
- **THEN** RecetAr rechaza la operación con un error de validación

### Requirement: Resolución del paciente por identificador de MPI
RecetAr SHALL resolver al paciente por su identificador de MPI cuando esté presente y SHALL usar el DNI como alternativa cuando no lo esté. Si no puede resolverlo, SHALL rechazar la operación.

#### Scenario: Paciente resuelto por id de MPI
- **WHEN** el documento incluye el identificador de MPI del paciente
- **THEN** RecetAr obtiene los datos del paciente desde ANDES y los usa en el documento

#### Scenario: Paciente inexistente
- **WHEN** el identificador de MPI o el DNI no corresponden a un paciente de ANDES
- **THEN** RecetAr rechaza la operación e informa que el paciente no existe

### Requirement: Historial de documentos por identificador de MPI
RecetAr SHALL permitir consultar los documentos recientes de un paciente sin DNI usando su identificador de MPI.

#### Scenario: Historial de paciente sin DNI
- **WHEN** se consultan los documentos recientes de un paciente sin DNI
- **THEN** RecetAr devuelve sus recetas, certificados y prácticas usando el identificador de MPI

### Requirement: Agregado posterior de DNI y validación
RecetAr SHALL permitir agregar un DNI a un paciente que no lo tenía, verificar que no exista otro paciente con ese DNI y validarlo contra RENAPER. Si la validación es exitosa, SHALL actualizar sus datos y persistir el estado `validado`. Si el DNI ya existe, SHALL bloquear la operación sin modificar datos.

#### Scenario: DNI nuevo y validación exitosa
- **WHEN** se agrega un DNI que no existe en ANDES y RENAPER devuelve los datos del paciente
- **THEN** RecetAr actualiza el paciente y lo deja en estado `validado`

#### Scenario: DNI duplicado
- **WHEN** se intenta agregar un DNI que ya pertenece a otro paciente de ANDES
- **THEN** RecetAr bloquea la operación con un error claro y no modifica ningún paciente

#### Scenario: RENAPER no encuentra al ciudadano
- **WHEN** se intenta validar un paciente y RENAPER no devuelve datos
- **THEN** RecetAr informa el error y el paciente no queda validado

### Requirement: Validación de paciente por identificador
RecetAr SHALL permitir validar un paciente existente usando su identificador, siempre que tenga DNI, y SHALL persistir en ANDES los datos validados y el estado `validado`.

#### Scenario: Validación por identificador
- **WHEN** se valida un paciente con DNI usando su identificador de MPI
- **THEN** RecetAr actualiza sus datos en ANDES y lo deja en estado `validado`

#### Scenario: Paciente sin DNI
- **WHEN** se intenta validar por identificador un paciente sin DNI
- **THEN** RecetAr rechaza la operación e indica que el DNI es obligatorio para validar

### Requirement: Eliminación de paciente
RecetAr SHALL permitir eliminar un paciente existente en ANDES. La eliminación SHALL ser definitiva en ANDES y SHALL requerir autorización.

#### Scenario: Eliminación autorizada
- **WHEN** un usuario autorizado elimina un paciente existente
- **THEN** RecetAr elimina el paciente en ANDES y responde sin contenido

#### Scenario: Paciente inexistente
- **WHEN** se intenta eliminar un paciente que no existe en ANDES
- **THEN** RecetAr responde que el paciente no fue encontrado

#### Scenario: Sin permiso
- **WHEN** un usuario sin permiso de eliminación invoca la operación
- **THEN** RecetAr responde 403

### Requirement: Permisos de gestión de pacientes
RecetAr SHALL permitir a profesionales actualizar y eliminar pacientes, y a auditores actualizar y eliminar pacientes. Los farmacéuticos SHALL conservar solo la lectura de pacientes.

#### Scenario: Profesional actualiza un paciente
- **WHEN** un profesional actualiza los datos de un paciente
- **THEN** RecetAr permite la operación

#### Scenario: Auditor elimina un paciente
- **WHEN** un auditor elimina un paciente
- **THEN** RecetAr permite la operación

#### Scenario: Farmacéutico intenta eliminar
- **WHEN** un farmacéutico intenta eliminar un paciente
- **THEN** RecetAr responde 403

### Requirement: Búsqueda de pacientes con estado
RecetAr SHALL incluir pacientes validados y temporales en la búsqueda y el listado de pacientes.

#### Scenario: Búsqueda devuelve temporal
- **WHEN** se busca un paciente que existe en ANDES con estado `temporal`
- **THEN** RecetAr lo devuelve en los resultados

#### Scenario: Búsqueda por DNI
- **WHEN** se busca un paciente por DNI
- **THEN** RecetAr devuelve los pacientes activos que coinciden, sin exigir que estén validados
