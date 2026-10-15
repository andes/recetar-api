# Tasks

## 1. Anulación en Praxis (suspend)

- [x] 1.1 Agregar `suspend(id, dto)` en `PrescriptionService`: marca `Suspendida` + `estadoActual`, busca el identificador de Praxis y su `hash`, y llama `annulPrescription`; local-first con registro del fallo
- [x] 1.2 Agregar el endpoint `PATCH /prescriptions/:id/suspend` con `checkAuth` + permiso y validación del body
- [x] 1.3 Hacer que `patchReceta` (`op:'suspender'`) también anule en Praxis cuando corresponda
- [x] 1.4 Proteger `delete`: rechazar con 409 las recetas con identificador externo de `praxis`

## 2. PDF de Praxis

- [x] 2.1 Agregar `getPdf(id)` en `PrescriptionService`: busca el identificador y el `hash` de Praxis y llama `getPrescriptionPdf(id, hash)`; 404/409 sin datos
- [x] 2.2 Agregar el endpoint `GET /prescriptions/:id/pdf` con `checkAuth` + permiso

## 3. Contrato y elegibilidad Praxis

- [x] 3.1 Alinear `PraxisPrescriptionResponse` con el Swagger v2 (`idPrescripcion`, `hash`, `recetasEmitidas`, `mensajes`)
- [x] 3.2 Guardar `praxisHash` y `praxisRecetas` (id, número y hash) en el modelo/servicio/job
- [x] 3.3 Normalizar sexo `Otro → X` y usar `tipoPrescripcion = M`
- [x] 3.4 Implementar `checkPraxisEligibility` (DNI, fechaNacimiento, sexo, matrícula, Alfabeta) y `PraxisNotEligibleError` → `no_aplicable`
- [x] 3.5 Tratar `mensajes[]` con severidad `E` como fallo
- [x] 3.6 Completar el profesional desde el usuario y mapear matrícula (numeroMatricula→enrollment), `tipoMatricula`/provincia por env, `tipoPrescriptor` por profesión y CUIT
- [x] 3.7 Leer la formación desde ANDES `formacionGrado` (`/core/tm/profesionales`) con fallback a `profesiones`, y sincronizar en login/registro/creación

## 4. Validación de ámbito y estado neutral

- [x] 4.1 Rechazar con 422 magistral o paciente sin DNI en ámbito privado
- [x] 4.2 Exponer `estadoPublicacion` y ocultar identificadores/`praxisHash`/`praxisRecetas` en respuestas de app

## 5. Configuración y verificación

- [x] 5.1 Agregar `PRAXYS_ENDPOINT`/`PRAXYS_API_KEY` (vacías) al `.env` y crear `.env.example`
- [x] 5.2 Tests: mapper, elegibilidad, suspensión/PDF con hash, respuesta y borrado protegido
- [x] 5.3 Ejecutar `npm run lint`, `npm run build` y `npm test`
- [x] 5.4 Actualizar OpenAPI (`prescription.openapi.yaml`, `praxis.openapi.yaml`)

## Workflow follow-up

- Archivar el change cuando se cumplan los requisitos de revisión del proyecto.
- Verificar el resultado archivado.
