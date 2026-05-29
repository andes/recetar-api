# Skill: Documentación de recetar-api

## Descripción
Guía para documentar los endpoints de la API usando OpenAPI 3.0 + YAML + markdown.

## Archivos por módulo

Cada módulo en `src/modules/<nombre>/` debe tener:

| Archivo | Propósito |
|---|---|
| `<nombre>.openapi.yaml` | Spec OpenAPI del módulo (paths, responses) |
| `docs/paths/<nombre>/<endpoint>.md` | Documentación detallada del endpoint |

## Convenciones del YAML

El YAML se escribe al lado del `.routes.ts` de cada módulo.

```yaml
# modules/auth/auth.openapi.yaml
paths:
  /auth/login:
    post:
      tags: [Auth]
      summary: Iniciar sesión
      x-description-file: docs/paths/auth/login.md
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                identifier:
                  type: string
                  example: profesional@test.com
                password:
                  type: string
      responses:
        "200":
          description: Login exitoso
          content:
            application/json:
              schema:
                type: object
                properties:
                  jwt:
                    type: string
                  refreshToken:
                    type: string
        "401":
          description: Credenciales inválidas
```

### Reglas

1. **`x-description-file`** — apunta al markdown en `docs/paths/`. El script de build lo resuelve a `description:`.
2. **`tags`** — el nombre del módulo (ej: `Auth`, `Patients`, `Prescriptions`).
3. **`security`** — si requiere JWT: `security: [{ bearerAuth: [] }]`.
4. **`responses`** — siempre incluir al menos 200/201 y los errores relevantes (401, 403, 404, 422).

## Documentación en markdown

Los archivos markdown en `docs/paths/` deben incluir:

```markdown
## POST /auth/login

<!-- Resumen de una línea -->

### Detalle

<!-- Explicación del comportamiento, reglas de negocio, dependencias -->

### Ejemplo cURL

```bash
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test","password":"test"}'
```
```

### Estructura de docs/

```
docs/
├── README.md              ← Explica la estructura del directorio
├── index.md               ← Descripción general (se usa en info.description del spec)
├── paths/                 ← Documentación por endpoint, agrupada por módulo
│   ├── auth/
│   │   ├── login.md
│   │   ├── register.md
│   │   └── jwt-login.md
│   └── ...
└── guides/                ← Guías de uso (futuro)

> `openapi.json` se genera en la raíz del proyecto vía `npm run docs:build`.
```

## Zod-to-OpenAPI (schemas)

Los DTOs de Zod se pueden registrar para generar `components/schemas` automáticamente:

```typescript
// modules/auth/auth.dto.ts
import { z } from 'zod';
import { getZodRegistry } from '../../config/openapi';

const loginSchema = z.object({
    identifier: z.string().min(1),
    password: z.string().min(1),
});

getZodRegistry().register('LoginDTO', loginSchema);
```

Luego en el YAML se referencian con `$ref: '#/components/schemas/LoginDTO'`.

## Comandos

| Comando | Descripción |
|---|---|
| `npm run docs:build` | Genera `openapi.json` en la raíz del proyecto a partir de los YAML |
| El spec se sirve automáticamente en `/api-docs` al iniciar el servidor |

## Verificación

Al documentar un módulo, verificar:

- [ ] `npm run build` compila sin errores
- [ ] `npm run docs:build` genera el spec sin errores
- [ ] Scalar en `/api-docs` muestra los endpoints correctamente
- [ ] Las descripciones en markdown se renderizan en Swagger UI
