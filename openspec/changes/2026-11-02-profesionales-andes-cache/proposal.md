# Proposal

## Why

La formación y matrícula del profesional estaban guardadas en `users` (`profesionGrado`, `enrollment`), lo que es incorrecto porque un usuario no es necesariamente un profesional. ANDES es la fuente de verdad (`formacionGrado`), y hoy las matrículas no se muestran en el perfil porque `users.profesionGrado` queda vacío. Además, ningún documento debe emitirse sin matrícula/formación resuelta.

## What Changes

- Quitar de `users` los datos de profesional: `profesionGrado`, `enrollment`, `firstName`, `lastName`, `razonSocial`. Se mantiene `businessName` y `cuil`.
- Usar la colección `professionals` como **caché del profesional de ANDES** ligado al usuario: `userId`, `tipoDocumento`, `documento`, `nombre`, `apellido`, `sexo`, `cuit`, `profesionGrado`, `actualizadoEn`.
- Refrescar el caché en el login (best-effort) y, si falta al emitir, consultar ANDES como fallback.
- Rechazar con 422 la emisión de receta/certificado/práctica/insumo si no se resuelve el profesional con matrícula.
- Agregar `tipoDocumento` y `documento` al snapshot `professional` de los documentos emitidos.
- Exponer `GET /professionals/me` y retirar el CRUD legacy de profesionales.

## Capabilities

### New Capabilities

- `professional-profile`: caché del perfil del profesional desde ANDES, ligado al usuario, con refresh en login y fallback.

### Modified Capabilities

- `prescription-management-api`: rechazo de emisión sin matrícula (422) y snapshot con `tipoDocumento`/`documento`.

## Impact

- **recetar-api**: modelos `users`/`professionals`, auth login, creación de recetas/certificados/prácticas, endpoints y OpenAPI.
- **recetar-app**: `User` sin datos profesionales; perfil/header consumen `/professionals/me`; nueva receta deja de enviar formación; manejo del 422.
- **api (ANDES)**: sin cambios (ya expone `formacionGrado`).
