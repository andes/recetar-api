# Proposal

## Why

Praxis exige el CUIT/CUIL del prescriptor para publicar recetas. Sin embargo, algunos profesionales no tienen `cuit` en ANDES, por lo que la emisión no puede completar el dato y la publicación falla. La cuenta de RecetAr sí conserva el CUIT/CUIL capturado en el alta.

## What Changes

- Resolver el CUIT/CUIL efectivo del profesional con precedencia `professionals.cuit` (ANDES) → `users.cuil` (cuenta), aceptando solo 11 dígitos con dígito verificador válido.
- Bloquear con 422 la emisión de receta, certificado o práctica cuando no se resuelve el CUIT/CUIL.
- Validar el CUIT/CUIL en el registro (`/auth/register`) y en la autogestión (`PATCH /users/me`).
- Registro profesional: si ANDES trae `cuit`, exigir coincidencia; si no lo trae, aceptar el CUIL del formulario.
- Praxis: marcar `Profesional sin CUIT/CUIL` como no elegible (`no_aplicable`).

## Impact

- Specs: `professional-profile`, `prescription-management-api`.
- Código: `modules/professionals`, `modules/auth`, `modules/users`, `integrations/praxis`, `shared/utils`.
