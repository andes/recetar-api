# Proposal

## Why

Hoy las recetas de medicamento viven en dos fuentes de verdad (ANDES y RecetAr) y el circuito está fragmentado: las recetas de ámbito público se crean en ANDES, no existe integración con Praxis y no se registran los identificadores que asignan los sistemas externos. Esto complejiza los jobs de actualización de estado y de interoperabilidad (`appNotificada`), y dificulta sumar nuevos sistemas. Se necesita una **fuente única de recetas** en RecetAr, integrada con Praxis y compatible con los consumidores actuales (HUDS vía ANDES, SIFAHO).

## What Changes

- RecetAr pasa a ser la **fuente única** de recetas de medicamento; ANDES deja de crear recetas nuevas en su colección y **proxya** las lecturas y la suspensión a RecetAr.
- **Integración con Praxis**: al crear una receta se crea también en Praxis, por insumo, con `tratamientoProlongado`; envío **local-first con reintento**.
- Nuevo array **`identificadoresExternos`** (`praxis` / `prestacion` / `registro`) con índice multikey compuesto (no único) y estado de sincronización por entidad (`syncExterno`).
- **Ingesta desde ANDES**: se reescribe el evento RUP `prestacion:receta:create` para crear la receta en RecetAr (RecetAr adapta el formato ANDES), preservando `idPrestacion` e `idRegistro`; la deduplicación pasa a RecetAr.
- RecetAr **expone el contrato de receta de ANDES** (lectura, suspensión, dispensa) y **mergea** las recetas históricas de ANDES hasta migrarlas.
- La **consulta de recetas por paciente** (que llega a RecetAr vía el proxy de ANDES para la HUDS) es parametrizable: sin `ambito` devuelve solo las públicas; con `ambito=todas`, todas las del paciente.
- Migración a RecetAr de los **jobs** de estado de recetas (vencimiento, actualización de dispensa) y de la **impresión/PDF** de recetas.

**Fuera de alcance**: recetas de insumos y `prestacion:recetaInsumo:create`; migración de recetas históricas; deprecación de la colección `receta` de ANDES; evWeb.

## Capabilities

### New Capabilities
- `prescription-external-identifiers`: almacenamiento y búsqueda de identificadores externos de la receta (`praxis`, `prestacion`, `registro`) con índice multikey.
- `prescription-praxis`: publicación de recetas de medicamento en Praxis (elegibilidad, genérico + sugerido comercial, tratamiento prolongado) con sincronización local-first y reintento.
- `prescription-management-api`: RecetAr expone el contrato de receta compatible con ANDES (lectura, suspensión, dispensa) y mergea las históricas, como fuente de verdad.
- `prescription-ingest`: ingesta de creación de recetas desde eventos de prestación de ANDES, con `idPrestacion`/`idRegistro` y deduplicación.

### Modified Capabilities

## Impact

- **recetar-api**: modelo/servicio/repositorio de `prescriptions`; wiring de la integración Praxis; nuevo endpoint interno de ingreso; contrato de receta compatible ANDES; jobs en `agenda-ui`; impresión/PDF.
- **api (ANDES)**: reescribir el handler `prestacion:receta:create` para llamar a RecetAr; proxy de lecturas/suspensión; dejar de escribir recetas nuevas.
- **Consumidores**: HUDS (vía proxy de ANDES, sin cambios), SIFAHO (solo URL + token de RecetAr).
- **Dependencia**: requiere `app-tokens-recetar` para autenticación sistema-a-sistema.
