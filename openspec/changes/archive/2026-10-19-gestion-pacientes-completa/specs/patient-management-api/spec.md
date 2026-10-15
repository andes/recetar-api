# Spec Delta

## ADDED Requirements

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
