# Spec Delta

## Purpose

Define cómo RecetAr recibe y procesa los eventos de ciclo de vida que Praxis envía a un servicio REST externo, para mantener el estado de las recetas alineado con la prescripción electrónica y la dispensa.

## ADDED Requirements

### Requirement: Superficie de recepción de eventos de Praxis
RecetAr SHALL exponer bajo un prefijo dedicado las cinco operaciones del contrato de Praxis: alta de prescripción, anulación de prescripción, anulación de receta, dispensa y anulación de dispensa, sin modificar las rutas existentes de recetas.

#### Scenario: Base URL configurable
- **WHEN** Praxis configura la URL base del servicio en `https://<host>/api/praxis`
- **THEN** las cinco operaciones quedan disponibles bajo ese prefijo

#### Scenario: APIs existentes intactas
- **WHEN** se despliega la nueva superficie
- **THEN** `/api/prescriptions` y `/api/modules/recetas` mantienen su contrato y comportamiento

### Requirement: Idempotencia por hash
RecetAr SHALL tratar el `hash` de prescripción y el `hash` de receta como claves de idempotencia: una entrega repetida del mismo evento SHALL responder 2xx y no SHALL duplicar recetas, dispensas ni anulaciones.

#### Scenario: Alta repetida
- **WHEN** llega dos veces el alta de la misma prescripción
- **THEN** RecetAr responde 2xx en ambas y mantiene una sola prescripción local

#### Scenario: Dispensa repetida
- **WHEN** llega dos veces la dispensa de la misma receta con el mismo `numeroAutorizacion`
- **THEN** RecetAr responde 2xx y registra una sola dispensa

#### Scenario: Anulación repetida
- **WHEN** llega dos veces la anulación del mismo hash
- **THEN** RecetAr responde 2xx y no agrega una anulación duplicada

### Requirement: Resolución por hash y semántica de no encontrado
RecetAr SHALL resolver la prescripción local por el hash de prescripción y la receta local por el hash de receta. Para anulación y dispensa, SHALL responder 404 si el hash no existe y 2xx si existe, aunque ya esté en el estado solicitado.

#### Scenario: Hash conocido
- **WHEN** llega una anulación o dispensa para un hash que existe localmente
- **THEN** RecetAr procesa el evento y responde 2xx

#### Scenario: Hash desconocido
- **WHEN** llega una anulación o dispensa para un hash que no existe localmente
- **THEN** RecetAr responde 404

#### Scenario: Estado ya aplicado
- **WHEN** llega la anulación de una receta que ya estaba anulada
- **THEN** RecetAr responde 2xx sin modificar el estado

### Requirement: Alta de prescripción
RecetAr SHALL aceptar el evento de prescripción emitida y, si la prescripción ya existe localmente, vincular los hashes de sus recetas; si no existe, SHALL registrar el evento para conciliación y responder 2xx.

#### Scenario: Prescripción propia
- **WHEN** llega el alta de una prescripción creada por RecetAr en Praxis
- **THEN** RecetAr confirma los hashes ya registrados y responde 2xx

#### Scenario: Prescripción desconocida
- **WHEN** llega el alta de una prescripción que no existe localmente
- **THEN** RecetAr registra el evento y responde 2xx para evitar reintentos

### Requirement: Anulación de prescripción y de receta
RecetAr SHALL marcar como anuladas la prescripción completa o la receta individual, exponiendo el estado `eliminada` y retirándolas de las consultas que SIFAHO usa para recetas disponibles.

#### Scenario: Anulación de prescripción
- **WHEN** llega la anulación del hash de prescripción
- **THEN** todos los documentos de esa prescripción quedan con `estadoActual.tipo = 'eliminada'`

#### Scenario: Anulación de receta
- **WHEN** llega la anulación del hash de una receta
- **THEN** solo ese documento queda con `estadoActual.tipo = 'eliminada'`

### Requirement: Dispensa y anulación de dispensa
RecetAr SHALL registrar la dispensa notificada por Praxis con su `numeroAutorizacion`, sus renglones y el sistema de origen, dejando la receta como `dispensada` o `dispensa-parcial`; la anulación de dispensa SHALL dejarla en `sin-dispensa` con la cancelación registrada.

#### Scenario: Dispensa total
- **WHEN** la dispensa cubre la cantidad prescripta
- **THEN** la receta queda `estadoDispensaActual.tipo = 'dispensada'` y disponible como dispensada para SIFAHO

#### Scenario: Dispensa parcial
- **WHEN** la dispensa cubre menos cantidad que la prescripta
- **THEN** la receta queda `estadoDispensaActual.tipo = 'dispensa-parcial'` con los renglones dispensados

#### Scenario: Anulación de dispensa
- **WHEN** llega la anulación de dispensa de una receta dispensada
- **THEN** la receta vuelve a `sin-dispensa` y registra la cancelación

### Requirement: Seguridad del servicio de eventos
RecetAr SHALL exigir transporte HTTPS en el borde y SHALL restringir el acceso por una lista de IPs permitidas; MAY exigir además una clave compartida en el header `x-api-key`. Las solicitudes no autorizadas SHALL rechazarse.

#### Scenario: IP autorizada
- **WHEN** un evento llega desde una IP de la lista permitida
- **THEN** RecetAr procesa el evento

#### Scenario: IP no autorizada
- **WHEN** un evento llega desde una IP fuera de la lista
- **THEN** RecetAr rechaza la solicitud

#### Scenario: Clave compartida incorrecta
- **WHEN** la clave compartida está configurada y el header no coincide
- **THEN** RecetAr rechaza la solicitud
