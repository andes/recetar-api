# Design

## Context

- ANDES expone el CUIT/CUIL personal del profesional en `cuit`, pero puede venir vacío.
- La cuenta de RecetAr (`users.cuil`) guarda el CUIL (profesional) o CUIT (farmacia) capturado en el alta.
- Praxis arma `prescriptor.cuit` desde el snapshot `professional.cuil`; sin ese dato la publicación falla.

## Goals / Non-Goals

**Goals:**

- Resolver un CUIT/CUIL válido para el profesional con fallback a la cuenta.
- Bloquear la emisión (422) cuando no se resuelve.
- Validar el CUIT/CUIL en registro y autogestión.

**Non-Goals:**

- Completar el CUIT/CUIL desde ANDES MPI.
- Cambiar el nombre del snapshot `professional.cuil` de los documentos emitidos.
- Renombrar `users.cuil` (se mantiene para JWT/dispensa).

## Decisions

- **Precedencia**: `professionals.cuit` si es válido; si no, `users.cuil` si es válido. El valor se normaliza a 11 dígitos.
- **Sin persistir el fallback**: el CUIL de la cuenta se resuelve en memoria en `requireForUser`; no se escribe en `professionals.cuit` para no pisar la fuente ANDES.
- **Bloqueo**: `ProfessionalCuilRequiredError` (422) desde `requireForUser`, por lo que aplica a receta, certificado y práctica.
- **Validación**: helper compartido `normalizeTaxId`/`isValidCuitCuil` reutilizado por DTOs y por la resolución.
- **Registro**: con `cuit` de ANDES se exige coincidencia; sin `cuit` se acepta el CUIL del formulario (válido).
- **Autogestión**: `PATCH /users/me` acepta `cuil` validado, para que profesionales existentes lo completen.

## Risks / Trade-offs

- [Profesionales existentes sin CUIL] → quedan bloqueados hasta completarlo en su perfil (autogestión) o por corrección de datos.
- [CUIT inválido en ANDES] → se ignora y se usa el de la cuenta; si tampoco hay, 422.
- [Datos legacy de 8 dígitos en `users.cuil`] → se descartan por la validación de 11 dígitos.
