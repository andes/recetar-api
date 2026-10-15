# Design

## Context

Ver `proposal.md` — Why. ANDES MPI ya expone `contacto` y `direccion` como listas, y RecetAr ya resuelve pacientes por `idMPI`. La API actual solo mapea y actualiza datos básicos, y la búsqueda no tiene filtros ni carga incremental.

## Goals / Non-Goals

**Goals:**

- Exponer una búsqueda paginada con término y filtros.
- Leer y actualizar contactos y dirección principal.
- Preservar contactos, direcciones y metadatos no editados.
- Mantener el contrato de pacientes sin DNI y la validación/eliminación existentes.

**Non-Goals:**

- Editar familiares, foto, notas, documentos, cobertura o documento extranjero.
- Crear una copia local del paciente.
- Modificar ANDES o sus esquemas.
- Implementar la pantalla del frontend.

## Decisions

### Búsqueda con `hasMore`

La búsqueda pide un resultado adicional al límite solicitado y devuelve `hasMore`. Alternativa descartada: depender de un total exacto de ANDES, porque la búsqueda por término libre no lo devuelve de forma consistente.

### Filtros traducidos a ANDES

Los filtros de estado, sexo, email y teléfono se traducen a los parámetros de búsqueda de ANDES MPI. Alternativa descartada: filtrar en memoria, porque solo aplicaría a la página actual.

### Contactos y dirección como listas

ANDES modela `contacto` y `direccion` como listas. La API normaliza una lista de contactos y direcciones, y al actualizar fusiona el contacto principal por tipo y la dirección principal sin borrar las entradas adicionales. Alternativa descartada: reemplazar la lista completa desde el formulario, porque perdería datos que el usuario no ve.

### Sin copia local

La lectura y escritura se resuelven contra ANDES. RecetAr solo persiste snapshots en documentos clínicos. Alternativa descartada: cachear contactos o direcciones localmente, porque generaría divergencia con MPI.

## Risks / Trade-offs

- [Pérdida de contactos o direcciones adicionales] → La API fusiona por tipo/ranking y conserva las entradas no editadas.
- [Búsqueda costosa] → Se exige un término mínimo y se pagina; los filtros se envían a ANDES.
- [Datos incompletos en ANDES] → Los campos de contacto y dirección son opcionales; la UI debe manejar ausencias.
- [DNI validado] → ANDES impide cambiar documento y estado; la API rechaza el intento y conserva los datos.
- [Dependencia de permisos] → La actualización requiere `mpi:paciente:patchAndes`; la eliminación requiere `mpi:paciente:deleteAndes`.

## Migration Plan

No hay migración de datos. El cambio se despliega con la API y queda disponible para el frontend. Rollback: revertir el deploy; los campos nuevos son opcionales y no afectan documentos existentes.
