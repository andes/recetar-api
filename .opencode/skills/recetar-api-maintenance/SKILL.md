# Skill: Mantenimiento de recetar-api

## Descripción
Reglas permanentes del proyecto para mantener consistencia en rutas, documentación, formato de respuestas y convenciones de código. Aplica a cualquier cambio en `src/` (código nuevo o modificación de existente) independientemente de la fase de refactorización.

## Activación
Cargar este skill cuando el agente necesite:
- Modificar rutas existentes o agregar nuevas
- Crear o modificar un módulo en `src/modules/`
- Hacer cambios en controladores, services o DTOS
- Verificar estado del proyecto antes de dar un cambio por completo

## Reglas de documentación

### OpenAPI siempre actualizado
Cada módulo en `src/modules/<nombre>/` tiene un `<nombre>.openapi.yaml`. Cualquier cambio en:
- Paths de la ruta (URL, método HTTP)
- Query params (nombre, tipo, requerido)
- Schemas del body (DTO de entrada/salida)
- Códigos de respuesta HTTP
- Tags o agrupación de endpoints

requiere **reflejarse automáticamente en el YAML**. El spec se genera desde `src/modules/**/*.openapi.yaml` al arrancar, no hay validación automática, por lo que la responsabilidad es del agente al hacer el cambio.

### Rutas nuevas requieren YAML nuevo
Si se crea un routes file nuevo (ej. `pharmacies.routes.ts`), debe tener su propio `pharmacies.openapi.yaml` al lado.

## Convención de rutas REST

| Operación | Método | Ruta | Código respuesta |
|---|---|---|---|
| Listar (con filtros) | GET | `/recurso` | 200 |
| Obtener por ID | GET | `/recurso/:id` | 200 / 404 |
| Crear | POST | `/recurso` | 201 / 422 |
| Actualizar (parcial) | PATCH | `/recurso/:id` | 200 / 404 / 422 |
| Eliminar | DELETE | `/recurso/:id` | 204 / 404 |

- `DELETE` **siempre responde 204** sin body. No 200, no `ApiResponse.success(...)`.
- Filtros van como **query params** en GET, no como sub-rutas (`/search`, `/user/:id`).
- `PATCH` para actualizaciones parciales (no `PUT`).
- Errores de validación responden **422** con código `VALIDATION_ERROR`.

## Formato de respuestas

### Listas paginadas
```json
{
  "status": "success",
  "data": {
    "practices": [],
    "total": 0,
    "offset": 0,
    "limit": 20
  }
}
```
Toda lista con paginación devuelve `{ items, total, offset, limit }`. La clave `items` varía según el recurso (ej. `practices`, `supplies`, `patients`).

### Recurso individual
```json
{
  "status": "success",
  "data": { ... }
}
```

### Error
```json
{
  "status": "error",
  "error": {
    "code": "RECURSO_NOT_FOUND",
    "message": "Insumo no encontrado",
    "details": []
  }
}
```

## Estructura de cada módulo

Un módulo completo en `src/modules/<nombre>/` tiene:

| Archivo | Obligatorio |
|---|---|
| `<nombre>.controller.ts` | Sí |
| `<nombre>.service.ts` | Sí |
| `<nombre>.repository.ts` | Sí |
| `<nombre>.routes.ts` | Sí |
| `<nombre>.dto.ts` | Sí |
| `<nombre>.errors.ts` | Sí |
| `<nombre>.types.ts` | Sí |
| `<nombre>.model.ts` | Sí (si hay modelo propio) |
| `<nombre>.openapi.yaml` | Sí |
| `index.ts` (composition root) | Sí |

## Estructura de cada integración

Una integración en `src/integrations/<nombre>/` representa un sistema externo del que se es consumidor. Sigue estas reglas:

| Archivo | Obligatorio | Descripción |
|---|---|---|
| `<nombre>.client.ts` | Sí | Cliente HTTP (axios/fetch) con lazy `ensureConfigured()`. No valida en constructor. |
| `<nombre>.types.ts` | Sí | Interfaces/tipos del sistema externo. |
| `index.ts` (barrel) | Sí | Re-exporta todo lo público (client, types, DTOs, errors, repos). |
| `<nombre>.dto.ts` | Si aplica | Schemas Zod para validar requests entrantes hacia el sistema externo. |
| `<nombre>.errors.ts` | Si aplica | Errores específicos de la integración (`<Nombre>NotFoundError`, `<Nombre>ConnectionError`). |
| `<nombre>.repository.ts` | Si hay modelo local | Repositorio para caché local de datos del sistema externo. |
| `<nombre>.model.ts` | Si hay caché local | Schema Mongoose para cachear datos del externo (con `timestamps: true`). |
| `<nombre>.mapper.ts` | Si aplica | Conversión entre tipos del externo y tipos locales del dominio. |
| `<nombre>.openapi.yaml` | Sí | Documenta schemas, contratos externos y propósito de la integración. |

**Reglas:**
- El `index.ts` es barrel, NO composition root (no instancia nada por defecto). La instanciación la hace quien consume.
- El cliente HTTP se configura lazy: lanza error si se usa sin configurar, no en import/constructor.
- Las DTOs de la integración validan datos **hacia** el externo. Las DTOs del módulo validan datos **del request HTTP**.
- Si la integración expone endpoints vía la API (proxy), documentarlos también en el `<nombre>.openapi.yaml` de la integración además del YAML del módulo que los monta.
- Variables de entorno inyectadas por constructor (nunca `process.env` directo).

## Índices de MongoDB

Si un cambio agrega campos nuevos a un schema Mongoose o cambia queries frecuentes, considerar si hacen falta índices compuestos. Ejecutar `.createIndex()` en el schema o agregar al archivo del modelo. No modificar modelos legacy en `src-legacy/`.

## Verificación pre-commit

Antes de dar un cambio por completo, ejecutar en orden:

```bash
npm run build
npm run lint
npm test
```

Los tres deben pasar sin errores. Si cualquiera falla, corregir antes de continuar.

## Archivos que no se modifican

- `src-legacy/` — nunca se toca, es referencia documental
- `src/models/` — schemas Mongoose legacy (user, role, permission) no se modifican
