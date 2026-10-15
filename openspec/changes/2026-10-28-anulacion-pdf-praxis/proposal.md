# Proposal

## Why

El circuito de recetas ya publica en Praxis al crear la receta (emisión) y guarda el `idPrescripcion` en `identificadoresExternos`. La anulación y la descarga del PDF de Praxis están implementadas en `PraxisClient` (`annulPrescription`, `getPrescriptionPdf`) pero no tienen exposición HTTP. Además, el contrato real de Praxis v2 exige el `hash` de la prescripción para PDF y anulación, y devuelve una respuesta distinta a la que asumía el cliente. La app y otros consumidores no pueden suspender una receta anulándola en Praxis ni obtener su PDF oficial. Praxis debe seguir siendo un servicio interno: se exponen endpoints neutrales.

## What Changes

- Persistir en la receta `praxisHash` y los datos de las recetas emitidas (`idReceta`, `numeroReceta`, `hash`) al publicar.
- `GET /prescriptions/:id/pdf` y `PATCH /prescriptions/:id/suspend` usan `idPrescripcion` + `praxisHash`; sin identificador/hash responden 404/409.
- Corregir el parseo de la respuesta real de Praxis v2: `{ idPrescripcion (number), hash, recetasEmitidas[], mensajes[] }`; un `mensaje` con severidad `E` se trata como fallo.
- Elegibilidad previa a enviar (DNI, fechaNacimiento, matrícula, código Alfabeta) y sexo `Otro → X` (Praxis admite `M|F|X`). `tipoPrescripcion` = `M` en el flujo comercial.
- Validación de ámbito en la creación: magistral y paciente sin DNI solo en organizaciones públicas (422 en privado).
- Exponer a la app un estado neutral `estadoPublicacion` (`ok` | `pendiente` | `error` | `no_aplicable` | `desconocido`) y ocultar los identificadores de integración.
- Sincronizar la formación del profesional desde ANDES (`/core/tm/profesionales` → `formacionGrado`) en login, registro y bajo demanda al crear la receta.

## Capabilities

### New Capabilities

### Modified Capabilities

- `prescription-praxis`: anulación/PDF con hash, elegibilidad de datos, sexo X y respuesta real de Praxis.
- `prescription-management-api`: endpoints neutrales de suspensión y PDF, validación de ámbito y estado neutral de publicación.

## Impact

- **recetar-api**: integración Praxis (mapper, client, tipos), servicio/job de recetas, modelo (`praxisHash`, `praxisRecetas`), validación de creación y vista orientada a app.
- **recetar-app**: consume los endpoints neutrales y `estadoPublicacion` (change separado en ese repo).
- **api (ANDES)**: sin cambios.
