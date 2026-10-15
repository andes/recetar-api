# Spec Delta

## Purpose

Extender la publicación en Praxis con la anulación de una receta y la obtención de su PDF, manteniendo a Praxis como un servicio interno de RecetAr.

## ADDED Requirements

### Requirement: Anulación en Praxis

RecetAr SHALL anular en Praxis una receta publicada cuando se la suspende, usando el identificador de Praxis guardado en `identificadoresExternos`. La suspensión local SHALL persistir aunque Praxis falle (local-first).

#### Scenario: Suspensión con identificador de Praxis

- **WHEN** se suspende una receta que tiene un identificador de Praxis
- **THEN** RecetAr la marca suspendida localmente y llama a la anulación en Praxis con ese identificador

#### Scenario: Falla de anulación en Praxis

- **WHEN** la anulación en Praxis falla
- **THEN** RecetAr conserva la suspensión local y registra el fallo sin bloquear la operación

#### Scenario: Suspensión sin identificador de Praxis

- **WHEN** se suspende una receta sin identificador de Praxis
- **THEN** RecetAr la suspende solo localmente

### Requirement: Obtención del PDF de Praxis

RecetAr SHALL devolver el PDF de una receta desde Praxis usando el identificador guardado, y SHALL responder 404/409 cuando no exista ese identificador.

#### Scenario: PDF disponible

- **WHEN** se solicita el PDF de una receta con identificador de Praxis
- **THEN** RecetAr obtiene el PDF desde Praxis y lo devuelve en base64 con su tipo de contenido

#### Scenario: PDF no disponible

- **WHEN** se solicita el PDF de una receta sin identificador de Praxis
- **THEN** RecetAr responde 404/409 sin llamar a Praxis

### Requirement: Elegibilidad de datos y sexo

RecetAr SHALL validar antes de publicar que la receta tenga DNI, fecha de nacimiento, sexo admitido (`M`, `F` o `X`), matrícula del prescriptor y al menos un producto con código Alfabeta. Cuando no cumpla, SHALL marcarla `no_aplicable` sin enviarla ni reintentar.

#### Scenario: Sexo "Otro"

- **WHEN** la receta corresponde a un paciente con sexo "Otro"
- **THEN** RecetAr lo envía como `X`

#### Scenario: Datos incompletos

- **WHEN** falta el DNI, la fecha de nacimiento, la matrícula o el código Alfabeta
- **THEN** RecetAr marca la sincronización como `no_aplicable` con el motivo

### Requirement: Hash y respuesta de Praxis

RecetAr SHALL guardar el `hash` de la prescripción y las recetas emitidas (id, número y hash) devueltas por Praxis, y SHALL usar el hash en la obtención del PDF y en la anulación.

#### Scenario: Publicación exitosa

- **WHEN** Praxis responde con la prescripción creada
- **THEN** RecetAr guarda `praxisHash` y las recetas emitidas junto al identificador de Praxis

#### Scenario: Mensaje de error en la respuesta

- **WHEN** la respuesta de Praxis incluye un mensaje con severidad `E`
- **THEN** RecetAr trata la publicación como fallida

### Requirement: Identificación del prescriptor

RecetAr SHALL enviar la matrícula del prescriptor (priorizando `numeroMatricula` y usando `enrollment` como fallback), el tipo y la provincia de matrícula (configurables, por defecto `P` y `Q`), el tipo de prescriptor derivado de la profesión (`M` médico, `O` odontólogo) y el CUIT cuando esté disponible.

#### Scenario: Profesional médico provincial

- **WHEN** el prescriptor es médico con matrícula provincial de Neuquén
- **THEN** RecetAr envía `tipoMatricula = P`, `idProvinciaMatricula = Q`, `tipoPrescriptor = M` y la matrícula

#### Scenario: Profesión no soportada

- **WHEN** la profesión del prescriptor no es médico ni odontólogo
- **THEN** RecetAr marca la receta como `no_aplicable` con el motivo
