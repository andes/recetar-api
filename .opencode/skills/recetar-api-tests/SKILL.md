# Skill: Tests de recetar-api

## Descripción
Guía para escribir tests automatizados en recetar-api usando Jest + ts-jest + Supertest + mongodb-memory-server.

## Activación
Cargar este skill cuando el agente necesite:
- Crear tests para un módulo nuevo o existente
- Agregar tests a shared/ o integraciones
- Verificar cobertura de un módulo
- Debuggear tests fallidos

## Stack

| Herramienta | Propósito |
|---|---|
| Jest | Test runner |
| ts-jest | Transpilación TypeScript en tiempo de test |
| Supertest | Pruebas HTTP contra Express |
| mongodb-memory-server | MongoDB en memoria (sin depender de MongoDB real) |

## Estructura de tests

```
tests/
├── globalSetup.ts             # Arranca MongoMemoryServer una vez, guarda URI
├── globalTeardown.ts          # Detiene MongoMemoryServer
├── env-setup.ts               # Setea process.env antes de cualquier import
├── helpers/
│   ├── db.ts                  # connectTestDB(), clearCollections()
│   ├── app.ts                 # createApp() → Express Listo para Supertest
│   ├── factories.ts           # createUser(), createRole()
│   └── auth.ts                # createAuthenticatedUser() → usuario + JWT
└── modules/
    └── <nombre>/
        ├── <nombre>.dto.test.ts
        ├── <nombre>.service.test.ts
        └── <nombre>.controller.test.ts
```

### Espejo de `src/`

La estructura dentro de `tests/modules/` refleja la de `src/modules/`. Cada archivo `.test.ts` se nombra igual que el archivo que prueba:

| Archivo fuente | Test |
|---|---|
| `src/modules/auth/auth.dto.ts` | `tests/modules/auth/auth.dto.test.ts` |
| `src/modules/auth/auth.service.ts` | `tests/modules/auth/auth.service.test.ts` |
| `src/modules/auth/auth.controller.ts` | `tests/modules/auth/auth.controller.test.ts` |

Para shared/ e integrations/ se usa la misma convención bajo `tests/shared/` y `tests/integrations/`.

## Filosofía

### Sin mocks
Todo corre contra MongoDB real en memoria. No se mockean repositorios, modelos ni servicios. Las únicas dependencias externas que NO se testean son llamadas HTTP a ANDES o email.

### DB global, colecciones limpias por test
- `MongoMemoryServer` se inicia **una vez** para toda la suite (globalSetup)
- Cada test suite (`describe`) limpia colecciones en `beforeEach`
- Los tests son independientes y pueden ejecutarse en cualquier orden

### Lo que se testea por capa

| Capa | Qué testear | Ejemplo |
|---|---|---|
| **DTOs** | Validación: valores válidos, inválidos, edge cases | `loginSchema.parse({})` lanza error |
| **Errors** | Instanciación, herencia, statusCode | `new NotFoundError('key')` → status 404 |
| **Service** | Lógica de negocio + queries reales | `authService.login(creds)` → jwt + refreshToken |
| **Controller** | Status codes, body ApiResponse, auth | POST `/auth/login` → 200 + `{ status, data }` |
| **Middleware** | Auth (con/sin token), validate (body inválido) | GET sin token → 401 con `{ status, error }` |
| **Error handler** | Formato unificado de error | Error 422 → `{ status: 'error', error: { code, message, details } }` |

### Lo que NO se testea
- Mongoose models directamente (infraestructura del framework)
- Conexión a MongoDB (mongodb-memory-server lo verifica)
- Llamadas HTTP externas (ANDES, email) — requieren setup específico
- Funciones triviales (< 3 líneas sin lógica condicional)

## Convenciones de escritura

### Patrón general de un test

```typescript
import { connectTestDB, clearCollections } from '../../helpers/db';
import { createUser } from '../../helpers/factories';
import { AuthRepository } from '../../../src/modules/auth/auth.repository';
import { AuthService } from '../../../src/modules/auth/auth.service';

// Logger stub (mínimo necesario para instanciar services)
const logger = {
    logInfo: (..._args: unknown[]) => {},
    logError: (..._args: unknown[]) => {},
    logWarn: (..._args: unknown[]) => {},
};

let repository: AuthRepository;
let service: AuthService;

beforeAll(async () => {
    await connectTestDB();  // Conecta mongoose + setea env vars
    repository = new AuthRepository();
    service = new AuthService(repository, logger as any);
});

beforeEach(async () => {
    await clearCollections();  // DB limpia antes de cada test
});

describe('AuthService', () => {
    describe('login', () => {
        it('returns jwt for valid credentials', async () => {
            await createUser({ username: 'testuser' });

            const result = await service.login({ identifier: 'testuser', password: 'password123' });

            expect(result).toHaveProperty('jwt');
            expect(result).toHaveProperty('refreshToken');
        });

        it('throws InvalidCredentialsError for wrong password', async () => {
            await createUser({ username: 'testuser' });

            await expect(
                service.login({ identifier: 'testuser', password: 'wrong' }),
            ).rejects.toThrow(InvalidCredentialsError);
        });
    });
});
```

### Patrón para controller tests (HTTP + Supertest)

```typescript
import request from 'supertest';
import { connectTestDB, clearCollections } from '../../helpers/db';
import { createUser } from '../../helpers/factories';
import { createAuthenticatedUser } from '../../helpers/auth';
import { createApp } from '../../helpers/app';

let app: ReturnType<typeof createApp>;

beforeAll(async () => {
    await connectTestDB();
    app = createApp();  // Express app con todas las rutas + errorhandler
});

beforeEach(async () => {
    await clearCollections();
});

describe('POST /api/auth/login', () => {
    it('returns 200 with tokens', async () => {
        await createUser({ username: 'test' });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ identifier: 'test', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.jwt).toBeDefined();
    });

    it('returns 401 for invalid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ identifier: 'nobody', password: 'x' });

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 422 for empty body', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({});

        expect(res.status).toBe(422);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});
```

### Patrón para DTO tests (Zod validation)

```typescript
import { loginSchema } from '../../../src/modules/auth/auth.dto';

describe('loginSchema', () => {
    it('accepts valid data', () => {
        const result = loginSchema.parse({ identifier: 'test', password: '12345678' });
        expect(result).toEqual({ identifier: 'test', password: '12345678' });
    });

    it('rejects empty identifier', () => {
        expect(() => loginSchema.parse({ identifier: '', password: '12345678' })).toThrow();
    });

    it('rejects missing fields', () => {
        expect(() => loginSchema.parse({})).toThrow();
    });
});
```

## Env vars para tests

El helper `connectTestDB()` setea automáticamente:

| Variable | Valor de test |
|---|---|
| `JWT_SECRET` | `test-jwt-secret` |
| `TOKEN_LIFETIME` | `1` |
| `APP_DOMAIN` | `http://localhost:4000` |
| `ANDES_ENDPOINT` | `http://localhost:9999` |
| `CF_SECRET_KEY` | `test-cf-secret` |

Si un test necesita otras env vars, setearlas en el `beforeAll`.

## Helpers disponibles

### `db.ts`
- `connectTestDB()` — conecta Mongoose al MongoMemoryServer, setea env vars
- `clearCollections()` — limpia todas las colecciones (llamar en `beforeEach`)

### `app.ts`
- `createApp()` — construye y devuelve una aplicación Express con todas las rutas montadas y el error handler global

### `factories.ts`
- `createRole(roleName)` — crea un Role en DB
- `createUser(overrides?)` — crea un usuario + role asociado

### `auth.ts`
- `createAuthenticatedUser(overrides?)` — crea un usuario + role + devuelve `{ user, token }` (JWT firmado)

## Comandos

| Comando | Descripción |
|---|---|
| `npm test` | Ejecuta Jest una vez |
| `npm run test:watch` | Jest en modo watch |
| `npm run test:coverage` | Jest con reporte de cobertura |

## Checklist por módulo

Al crear tests para un módulo:

- [ ] DTOs: validaciones correctas (válido, inválido, edge cases)
- [ ] Service: casos felices + errores de negocio
- [ ] Controller: status codes + body en formato ApiResponse
- [ ] Controller: 401 sin token, 422 body inválido, 404 recurso inexistente
- [ ] Tests pasan con `npm test` (sin saltos ni errores)
- [ ] Sin tests rotos que dependan de DB externa
- [ ] Cobertura dentro de thresholds (70% branches, 80% functions, 85% lines)
