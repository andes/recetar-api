# Design

## Context

Ver `proposal.md - Why`. Estado y restricciones que moldean el enfoque:

- **Dos fuentes hoy.** ANDES crea recetas desde eventos RUP (`api/modules/rup/controllers/rup.events.ts`, `prestacion:receta:create`) en su colección `receta` (`receta-schema.ts`), con estados (`estadoActual`, `estados[]`), dispensa (`dispensa[]`, `estadoDispensaActual`, `estadosDispensa[]`) y `idPrestacion`/`idRegistro`. RecetAr tiene su propio `prescription.model.ts` (más simple: `supplies[]`, `status`).
- **Consumidores actuales.** La HUDS (frontend `work/app`) consume `GET /modules/recetas` y `PATCH /modules/recetas` (suspender), y usa `medicamento.ordenTratamiento`, `estadoActual.tipo` y `estadosDispensa[]` (con `sistema` y `cancelada`). SIFAHO usa el mismo contrato desde afuera. Los históricos viven en ANDES.
- **Praxis v2** (`bruno/PRAXYS`): `POST /api/v2/prescripcion` con `renglon.producto = { codigoAlfabeta, codigoBarras }`. No documenta genérico/sugerido.
- **Vademecum/alfabeta**: el frontend ya emite `code.source = 'ALFABETA'` con `value = vademecum.id` y `barCode = codigoDeBarras[0]`; los campos de droga/presentación son estructurados.
- **Tratamiento prolongado ya modelado** (trabajo del equipo ya en el branch, posterior al relevamiento inicial): `tratamientoProlongado` es un **número de meses** (2–12, por supply y con fallback global) y las recetas se agrupan con `treatmentGroupId` y fechas escalonadas (+30d). `trimestral` quedó como alias legacy de solo lectura. Este change se integra sobre eso; se agregó `ordenTratamiento` (0..n-1).
- **Creación resuelve paciente**: `create` exige un paciente existente vía `patientService.resolveSnapshot(dni, sexo)`.
- **DTO sin genérico/sugerido**: el `supply` actual solo lleva `code.source` (`SIFAHO|SNOMED|ALFABETA|ANDES`) y `barCode`; no existe todavía el modelado de genérico + sugerido comercial.
- **Auth**: se resuelve en el change prerrequisito `app-tokens-recetar`.
- **Jobs**: el `src/` nuevo no tiene runner; el worker es `agenda-ui` (instancia única en producción, APIs detrás de nginx).

## Goals / Non-Goals

**Goals:**
- Que RecetAr sea la fuente de verdad de las recetas de medicamento, compatible con los consumidores actuales sin que cambien su parseo.
- Integrar Praxis con envío por insumo, local-first y reintento.
- Registrar identificadores externos (`praxis`, `prestacion`, `registro`) con búsqueda indexada.

**Non-Goals:**
- Recetas de insumos y magistrales en Praxis (los magistrales se persisten igual).
- Migrar los históricos de recetas de ANDES (coexistencia vía merge en el proxy).
- Deprecar la colección `receta` de ANDES.
- Definir el mecanismo de tokens (change `app-tokens-recetar`).

## Decisions

- **RecetAr como fuente única; ANDES proxya y mergea.** Las lecturas/suspensión de recetas nuevas van a RecetAr; el proxy de ANDES combina nuevas + históricas en el mismo formato. Alternativa: mantener doble fuente con sincronización; se descarta por complejidad de jobs y `appNotificada`.
- **RecetAr expone el contrato de receta de ANDES (completo, solo medicamento).** Se replican `GET /recetas`, `/motivos`, `/filtros`, `/profesional/:id`, `/verificar`, `PATCH`, `POST`. Alternativa: que cada consumidor se adapte; se descarta porque SIFAHO no puede cambiar código (solo URL + token).
- **Consulta por paciente parametrizable.** La consulta de recetas por paciente acepta el parámetro `ambito`: sin parámetro devuelve solo las públicas (comportamiento actual de la HUDS); con `ambito=todas` devuelve todas (públicas y privadas). Alternativa: un parámetro nuevo dedicado; se descarta para no agregar otro eje, reutilizando el `ambito` existente. El parámetro se propaga a través del proxy de ANDES.
- **Ingesta por endpoint interno (RecetAr adapta).** El handler de ANDES reemplaza `crearReceta(...)` por un POST a RecetAr; RecetAr adapta el formato ANDES. Alternativa: que ANDES mapee al DTO de RecetAr; se descarta para que el cambio en ANDES sea mínimo.
- **Identificadores externos como array indexado.** `identificadoresExternos: [{ entidad, valor }]` con índice multikey compuesto no único (`$elemMatch`), en vez de campos dedicados, por extensibilidad. No único porque una prestación/registro origina varios documentos.
- **Praxis por insumo con dedupe de id.** 1 petición por medicamento; el `tratamientoProlongado` booleano que recibe Praxis se deriva de los meses del modelo (`tratamientoProlongado > 1`), no del alias `trimestral`. El `idPrescripcion` se comparte entre los meses del tratamiento (mismo `treatmentGroupId`), distinguidos por `ordenTratamiento`.
- **Genérico + sugerido comercial.** Se guardan ambos; a Praxis se manda el `codigoAlfabeta` del sugerido (elegido o por defecto por menor precio). El modelado de genérico + sugerido es **neto nuevo** (hoy el DTO no lo tiene); requiere ampliar `supply`/DTO y el frontend. Alternativa: mandar el código de un genérico; bloqueada por falta de contrato de Praxis (ver Open Questions).
- **Sincronización local-first con job en `agenda-ui`.** Escaneo de pendientes cada 15 min, 3 intentos, luego `error`. Alternativa: encolar un job por receta; se descarta a favor del scan, más simple y sin duplicados con la instancia única.

## Risks / Trade-offs

- [Praxis no documenta genérico/sugerido] → marcar como open question; enviar el código del sugerido y aislar el mapper para cambiarlo cuando Praxis confirme.
- [Replicar el contrato completo amplía el modelo de RecetAr] → adaptar/expandir el modelo hacia el shape de ANDES; hacerlo por capas (view/adapters) para no romper el modelo actual.
- [Doble lectura durante la coexistencia] → el proxy (ANDES) mergea; documentar el orden y el desempate por fecha/estado.
- [Caída de Praxis] → local-first + reintento; la receta queda `pendiente`/`error` observable.
- [Rotación de token de aplicación] → coordinar con ANDES/SIFAHO (change prerrequisito).
- [Dependencia del change `app-tokens-recetar`] → el ingreso y el consumo de SIFAHO quedan bloqueados hasta tener tokens de aplicación.

## Migration Plan

1. Desplegar `app-tokens-recetar` (prerrequisito).
2. RecetAr: modelo con identificadores externos + integración Praxis + endpoint de ingreso.
3. ANDES: reescribir `prestacion:receta:create` para llamar a RecetAr; agregar proxy de lecturas/suspensión con merge de históricas.
4. Migrar jobs de estado y la impresión/PDF a RecetAr.
5. Reapuntar SIFAHO a RecetAr (URL + token).
6. En el futuro: migrar históricos y deprecar la colección `receta` de ANDES (change aparte).

## Open Questions

- ¿Praxis soporta recetar por droga/genérico y un campo "sugerido"? (spike con Praxis)
- Mapeo SNOMED/conceptId → droga/alfabeta (gap conocido) y criterio por defecto del sugerido (menor precio).
- Alcance exacto de la migración de jobs e impresión/PDF (qué endpoints y consumidores además de los identificados).
