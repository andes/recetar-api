# Spec Delta

## Purpose

Definir la resolución y validación del CUIT/CUIL del profesional para la emisión de documentos y la publicación en Praxis.

## ADDED Requirements

### Requirement: CUIT/CUIL efectivo del profesional

RecetAr SHALL resolver el CUIT/CUIL del profesional priorizando `professionals.cuit` (ANDES) y usando `users.cuil` como respaldo, aceptando solo 11 dígitos con dígito verificador válido.

#### Scenario: ANDES trae CUIT/CUIL

- **WHEN** ANDES devuelve un `cuit` válido para el profesional
- **THEN** la emisión usa ese valor

#### Scenario: ANDES no trae CUIT/CUIL

- **WHEN** ANDES no devuelve `cuit` y la cuenta tiene un CUIL válido
- **THEN** la emisión usa el CUIL de la cuenta

#### Scenario: Sin CUIT/CUIL resoluble

- **WHEN** no hay `cuit` válido en ANDES ni CUIL válido en la cuenta
- **THEN** la emisión de receta, certificado o práctica responde 422 y no se persiste el documento

### Requirement: Registro y autogestión del CUIT/CUIL

RecetAr SHALL validar el CUIT/CUIL (11 dígitos + verificador) en el registro y en la autogestión del usuario.

#### Scenario: Registro profesional sin CUIT/CUIL en ANDES

- **WHEN** el profesional se registra y ANDES no devuelve `cuit`
- **THEN** se acepta el CUIL informado en el formulario si es válido

#### Scenario: Edición del CUIL

- **WHEN** el profesional edita su CUIL desde su perfil
- **THEN** `PATCH /users/me` lo valida y lo persiste en `users.cuil`
