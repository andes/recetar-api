# Tasks

## 1. Modelo y almacenamiento de recetas

- [ ] 1.1 Agregar `identificadoresExternos` (`{ entidad, valor }`) y `syncExterno` al modelo/tipos de `prescriptions` y verificar con test de creación/lectura del documento
- [ ] 1.2 Crear el índice multikey compuesto no único `{ 'identificadoresExternos.entidad': 1, 'identificadoresExternos.valor': 1 }` y verificar con `explain()` que la búsqueda por `$elemMatch` lo usa
- [ ] 1.3 Implementar el upsert de identificadores por entidad y la búsqueda por identificador externo en el repositorio, y verificar con tests (alta, no duplica, búsqueda por prestación/registro/praxis)
- [ ] 1.4 Incorporar orden y fechas escalonadas para recetas de tratamiento prolongado y verificar con test que comparten identificadores y se distinguen por orden

## 2. Integración con Praxis

- [ ] 2.1 Cablear `PraxisClient`/`PraxisMapper` en el composition root de `prescriptions` con la config de entorno (`PRAXYS_ENDPOINT`, `PRAXYS_API_KEY`) y verificar que el build y un test de creación pasan
- [ ] 2.2 Implementar la elegibilidad (medicamento no magistral) y el envío por insumo con `tratamientoProlongado`, guardando el `idPrescripcion` en los identificadores, y verificar con test unitario del mapper y del flujo
- [ ] 2.3 Implementar la selección de genérico + sugerido comercial y el envío del `codigoAlfabeta` del sugerido (elegido o por defecto), y verificar con test que el payload de Praxis usa el código del sugerido
- [ ] 2.4 Marcar `no_aplicable` los casos no enviables (magistral) y verificar con test que no se envía y se persiste con ese estado
- [ ] 2.5 Implementar la sincronización local-first (estado `pendiente` al fallar) y verificar con test que la receta queda persistida con `syncExterno.praxis.estado = 'pendiente'`
- [ ] 2.6 Implementar el job de reintento en `src/agenda/jobs/` (escaneo de pendientes, 3 intentos, luego `error`) registrado para `agenda-ui`, y verificar con test del handler (éxito, falla y agotamiento de intentos)

## 3. Ingesta desde ANDES

- [ ] 3.1 Exponer el endpoint interno de ingreso de recetas con formato ANDES, autenticado con token de aplicación, y verificar con test (autorizado y no autorizado)
- [ ] 3.2 Implementar la adaptación formato ANDES → modelo de RecetAr, preservando `idPrestacion`, `idRegistro`, paciente, profesional, organización, medicamento y diagnóstico, y verificar con test de mapeo
- [ ] 3.3 Implementar la deduplicación por `idRegistro` + conceptId (o nombre del magistral) y verificar con test que una segunda creación no duplica
- [ ] 3.4 Implementar la generación de N recetas para tratamiento prolongado (orden, fechas escalonadas, estados iniciales) y verificar con test

## 4. API compatible con ANDES

- [ ] 4.1 Implementar los endpoints de lectura de recetas (`GET /recetas`, `/motivos`, `/filtros`, `/profesional/:id`, `/verificar`) con el formato de receta de ANDES y verificar con tests de contrato
- [ ] 4.2 Implementar `PATCH /recetas` (suspender, dispensar, cancelar-dispensa, rechazar, sin-dispensar) sobre la fuente RecetAr y verificar con tests por operación
- [ ] 4.3 Implementar la consulta de estado por prestación (`idPrestacion` → lista con estado, dispensa e `idReceta`) y verificar con test
- [ ] 4.4 Implementar la consulta de recetas públicas por paciente (solo públicas) y verificar con test que excluye las privadas
- [ ] 4.5 Implementar el merge de recetas históricas (ANDES) + nuevas (RecetAr) en las lecturas por prestación y verificar con test de combinación
- [ ] 4.6 Documentar el contrato de recetas (endpoints, request/response) en el OpenAPI del módulo y verificar que la spec generada lo incluye

## 5. Jobs de estado e impresión

- [ ] 5.1 Migrar a RecetAr el job de vencimiento de recetas y verificar con test de transición de estados
- [ ] 5.2 Migrar a RecetAr el job de actualización de estados de dispensa y verificar con test de sincronización
- [ ] 5.3 Migrar la impresión/PDF de recetas a RecetAr (idReceta/código de barras) y verificar que el PDF se genera con el identificador correcto

## 6. Cambios en ANDES (`api`)

- [ ] 6.1 Reescribir el handler `prestacion:receta:create` para llamar al endpoint de ingreso de RecetAr y verificar que no persiste receta nueva en la colección local
- [ ] 6.2 Implementar el proxy de lecturas de recetas (por prestación y por paciente) con merge de históricas + nuevas, y verificar el formato devuelto contra el que consume la HUDS
- [ ] 6.3 Implementar el proxy de suspensión (`PATCH /recetas` op suspender) hacia RecetAr para las recetas nuevas y verificar el flujo completo

## 7. Verificación de integración

- [ ] 7.1 Verificar extremo a extremo: prestación → ingreso en RecetAr → envío a Praxis → consulta por prestación desde el proxy de ANDES
- [ ] 7.2 Ejecutar la verificación de cada repo afectado (`recetar-api`: `npm run lint`, `npm run build`, `npm test`; `api`: comandos propios) y registrar el resultado por repo

## Workflow follow-up

- Archivar el change cuando se cumplan los requisitos de revisión del proyecto.
- Verificar el resultado archivado.
