# Design

## Context

Ver `proposal.md` — Why. RecetAr ya usa ANDES MPI como fuente de verdad de pacientes y guarda snapshots de paciente en recetas, certificados y prácticas. El modelo actual exige DNI en el alta y en los documentos, y resuelve al paciente por DNI. ANDES MPI admite pacientes sin `documento` y las recetas de ANDES usan el identificador de MPI del paciente.

## Goals / Non-Goals

**Goals:**

- Habilitar pacientes sin DNI en ANDES MPI con estado `temporal`.
- Permitir documentos clínicos sin DNI usando el identificador de MPI.
- Mantener la validación RENAPER para pacientes con DNI.
- Permitir completar el DNI y validar más adelante.
- Mantener el historial y la eliminación de pacientes contra ANDES.

**Non-Goals:**

- Pantalla completa de gestión de pacientes y edición de contacto/dirección.
- Migrar pacientes históricos.
- Modificar ANDES o su modelo de datos.
- Validar pacientes sin DNI.
- Modificar el flujo legacy `/profesionales/recetas/nueva`.

## Decisions

### Identificador de MPI como vínculo principal

Se usa `idMPI` como identificador del paciente en los documentos. El DNI pasa a ser opcional y se conserva como dato de identidad cuando existe. Alternativa descartada: usar solo el DNI, porque impide pacientes sin documento y obliga a duplicar búsquedas por nombre.

### Paciente sin DNI como temporal

El alta sin DNI crea el paciente en ANDES con `estado: 'temporal'`, sin `documento`, con nombre, apellido, sexo y fecha de nacimiento opcional. No se llama a RENAPER. Alternativa descartada: crear solo un paciente local, porque rompe la fuente de verdad en ANDES.

### Documentos con DNI opcional

Los DTO, modelos y servicios de recetas, certificados y prácticas aceptan DNI vacío si hay `idMPI`. La resolución del paciente prioriza `idMPI` y usa el DNI como alternativa. Los snapshots guardan `idMPI` y el estado del paciente.

### Historial por identificador

Los documentos recientes se consultan por `patient.idMPI` cuando no hay DNI. Se mantiene la consulta por DNI para compatibilidad.

### Validación y DNI posterior

Agregar DNI es una operación explícita: se verifica que el DNI no exista en ANDES, se valida con RENAPER y se actualizan los datos. Si el DNI ya existe, se bloquea para evitar duplicados. La validación por identificador exige DNI y persiste `estado: 'validado'`.

### Eliminación y permisos

La eliminación se delega a ANDES y requiere autorización. Profesionales y auditores pueden actualizar y eliminar pacientes; farmacéuticos conservan solo lectura. La eliminación es irreversible y los documentos de RecetAr conservan su snapshot.

### Búsqueda con temporales

La búsqueda y el listado incluyen pacientes validados y temporales. Esto permite encontrar pacientes sin DNI creados desde RecetAr.

## Risks / Trade-offs

- [Sin RENAPER no hay validación] → El paciente queda `temporal` y se muestra como no validado; la validación queda disponible cuando se cargue el DNI.
- [Duplicados por nombre] → Sin DNI no se puede comparar por documento; se acepta el riesgo y se bloquean duplicados al agregar un DNI.
- [Búsqueda de farmacia por DNI no encuentra estos pacientes] → La receta local se puede buscar por nombre; se documenta como limitación operativa.
- [Eliminación irreversible] → Se exige confirmación en el frontend y autorización en la API; los documentos conservan el snapshot.
- [Permiso de ANDES faltante] → La eliminación falla con error de permisos; se requiere `mpi:paciente:deleteAndes` en el token de aplicación.
- [Documentos existentes] → No se migran; el DNI sigue siendo el identificador cuando está presente.
