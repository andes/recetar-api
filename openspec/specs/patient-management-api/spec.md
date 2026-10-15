# patient-management-api Specification

## Purpose
Permite gestionar pacientes en ANDES MPI y usarlos en documentos clínicos aunque no tengan DNI, preservando la trazabilidad por identificador de MPI y el estado de validación.

## Requirements

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

### Requirement: Búsqueda paginada de pacientes con filtros
RecetAr SHALL permitir buscar pacientes por término y filtrar por estado, sexo, email y teléfono. La búsqueda SHALL devolver resultados paginados e informar si existen más resultados para cargar.

#### Scenario: Búsqueda por término
- **WHEN** se busca un paciente por nombre, apellido o DNI
- **THEN** RecetAr devuelve los pacientes activos que coinciden y si hay más resultados

#### Scenario: Filtros de búsqueda
- **WHEN** se busca con filtros de estado, sexo, email o teléfono
- **THEN** RecetAr aplica esos filtros y devuelve solo los pacientes que cumplen todos

#### Scenario: Carga incremental
- **WHEN** se solicitan más resultados con un desplazamiento mayor
- **THEN** RecetAr devuelve la siguiente página e informa si quedan más pacientes

#### Scenario: Paciente temporal
- **WHEN** el paciente existe en ANDES con estado `temporal`
- **THEN** RecetAr lo incluye en los resultados

### Requirement: Datos de contacto del paciente
RecetAr SHALL exponer los contactos del paciente con tipo email, celular o teléfono fijo, y SHALL permitir actualizarlos. Al actualizar un contacto SHALL conservar los contactos de otros tipos y los contactos adicionales que no se hayan editado.

#### Scenario: Lectura de contactos
- **WHEN** se consulta un paciente con contactos registrados en ANDES
- **THEN** RecetAr devuelve su email, celular y teléfono fijo cuando existan

#### Scenario: Actualización de contacto
- **WHEN** se actualiza el email, el celular o el teléfono fijo de un paciente
- **THEN** RecetAr actualiza el contacto en ANDES y devuelve el paciente con los datos vigentes

#### Scenario: Contactos adicionales
- **WHEN** el paciente tiene más de un contacto del mismo tipo y se edita el principal
- **THEN** RecetAr conserva los contactos adicionales que no fueron editados

### Requirement: Datos de dirección del paciente
RecetAr SHALL exponer la dirección principal del paciente con calle, código postal, barrio, localidad, provincia y país, y SHALL permitir actualizarla. Al actualizar la dirección SHALL conservar las direcciones adicionales y los datos de georreferenciación que no se editen.

#### Scenario: Lectura de dirección
- **WHEN** se consulta un paciente con dirección registrada en ANDES
- **THEN** RecetAr devuelve calle, código postal, barrio, localidad, provincia y país cuando existan

#### Scenario: Actualización de dirección
- **WHEN** se actualiza la dirección principal de un paciente
- **THEN** RecetAr actualiza la dirección en ANDES y devuelve el paciente con los datos vigentes

#### Scenario: Direcciones adicionales
- **WHEN** el paciente tiene más de una dirección y se edita la principal
- **THEN** RecetAr conserva las direcciones adicionales que no fueron editadas

### Requirement: Actualización completa de paciente
RecetAr SHALL permitir actualizar los datos de identidad, contacto y dirección de un paciente en una sola operación, respetando las reglas de DNI y estado del paciente.

#### Scenario: Actualización completa
- **WHEN** se actualizan datos de identidad, contacto y dirección de un paciente
- **THEN** RecetAr persiste todos los cambios en ANDES y devuelve el paciente completo

#### Scenario: Paciente validado
- **WHEN** se intenta modificar el DNI de un paciente validado
- **THEN** RecetAr rechaza el cambio y mantiene los datos existentes

#### Scenario: Paciente sin DNI
- **WHEN** se actualiza un paciente sin DNI sin informar DNI
- **THEN** RecetAr actualiza sus datos y lo mantiene como no validado
