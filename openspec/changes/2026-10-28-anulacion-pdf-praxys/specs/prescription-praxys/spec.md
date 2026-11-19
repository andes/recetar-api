# Spec Delta

## Purpose

Extender la publicación en Praxys con la anulación de una receta y la obtención de su PDF, manteniendo a Praxys como un servicio interno de RecetAr.

## ADDED Requirements

### Requirement: Anulación en Praxys

RecetAr SHALL anular en Praxys una receta publicada cuando se la suspende, usando el identificador de Praxys guardado en `identificadoresExternos`. La suspensión local SHALL persistir aunque Praxys falle (local-first).

#### Scenario: Suspensión con identificador de Praxys

- **WHEN** se suspende una receta que tiene un identificador de Praxys
- **THEN** RecetAr la marca suspendida localmente y llama a la anulación en Praxys con ese identificador

#### Scenario: Falla de anulación en Praxys

- **WHEN** la anulación en Praxys falla
- **THEN** RecetAr conserva la suspensión local y registra el fallo sin bloquear la operación

#### Scenario: Suspensión sin identificador de Praxys

- **WHEN** se suspende una receta sin identificador de Praxys
- **THEN** RecetAr la suspende solo localmente

### Requirement: Obtención del PDF de Praxys

RecetAr SHALL devolver el PDF de una receta desde Praxys usando el identificador guardado, y SHALL responder 404/409 cuando no exista ese identificador.

#### Scenario: PDF disponible

- **WHEN** se solicita el PDF de una receta con identificador de Praxys
- **THEN** RecetAr obtiene el PDF desde Praxys y lo devuelve en base64 con su tipo de contenido

#### Scenario: PDF no disponible

- **WHEN** se solicita el PDF de una receta sin identificador de Praxys
- **THEN** RecetAr responde 404/409 sin llamar a Praxys

### Requirement: Elegibilidad de datos y sexo

RecetAr SHALL validar antes de publicar que la receta tenga DNI, fecha de nacimiento, sexo admitido (`M`, `F` o `X`), matrícula del prescriptor y al menos un producto con código Alfabeta. Cuando no cumpla, SHALL marcarla `no_aplicable` sin enviarla ni reintentar.

#### Scenario: Sexo "Otro"

- **WHEN** la receta corresponde a un paciente con sexo "Otro"
- **THEN** RecetAr lo envía como `X`

#### Scenario: Datos incompletos

- **WHEN** falta el DNI, la fecha de nacimiento, la matrícula o el código Alfabeta
- **THEN** RecetAr marca la sincronización como `no_aplicable` con el motivo

### Requirement: Hash y respuesta de Praxys

RecetAr SHALL guardar el `hash` de la prescripción y las recetas emitidas (id, número y hash) devueltas por Praxys, y SHALL usar el hash en la obtención del PDF y en la anulación.

#### Scenario: Publicación exitosa

- **WHEN** Praxys responde con la prescripción creada
- **THEN** RecetAr guarda `praxysHash` y las recetas emitidas junto al identificador de Praxys

#### Scenario: Mensaje de error en la respuesta

- **WHEN** la respuesta de Praxys incluye un mensaje con severidad `E`
- **THEN** RecetAr trata la publicación como fallida

### Requirement: Identificación del prescriptor

RecetAr SHALL enviar la matrícula del prescriptor (priorizando `numeroMatricula` y usando `enrollment` como fallback), el tipo y la provincia de matrícula (configurables, por defecto `P` y `Q`), el tipo de prescriptor derivado de la profesión (`M` médico, `O` odontólogo) y el CUIT cuando esté disponible.

#### Scenario: Profesional médico provincial

- **WHEN** el prescriptor es médico con matrícula provincial de Neuquén
- **THEN** RecetAr envía `tipoMatricula = P`, `idProvinciaMatricula = Q`, `tipoPrescriptor = M` y la matrícula

#### Scenario: Profesión no soportada

- **WHEN** la profesión del prescriptor no es médico ni odontólogo
- **THEN** RecetAr marca la receta como `no_aplicable` con el motivo
